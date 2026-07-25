import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { syncInvoiceStatuses } from "./numbering";

export type TxClient = Prisma.TransactionClient;

export function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function sumClientOutstanding(clientId: string, tx: TxClient | typeof prisma = prisma) {
  const agg = await tx.invoice.aggregate({
    where: {
      clientId,
      invoiceStatus: { notIn: ["DRAFT", "CANCELLED"] },
    },
    _sum: { remainingBalance: true },
  });
  return money(agg._sum.remainingBalance || 0);
}

/** Rebuild denormalized client.creditBalance from invoice remainings */
export async function syncClientCreditBalance(clientId: string, tx: TxClient | typeof prisma = prisma) {
  const outstanding = await sumClientOutstanding(clientId, tx);
  await tx.client.update({
    where: { id: clientId },
    data: { creditBalance: outstanding },
  });
  return outstanding;
}

export async function sumInvoicePayments(invoiceId: string, tx: TxClient | typeof prisma = prisma) {
  const agg = await tx.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  return money(agg._sum.amount || 0);
}

/**
 * Cash applied to an invoice.
 * Prefer Payment rows. Legacy invoices may still have advancePayment with no Payment row.
 */
export async function getInvoiceCashApplied(
  invoice: { id: string; advancePayment: number },
  tx: TxClient | typeof prisma = prisma
) {
  const paymentsSum = await sumInvoicePayments(invoice.id, tx);
  const advanceRows = await tx.payment.count({
    where: {
      invoiceId: invoice.id,
      OR: [
        { paymentMethod: "Advance" },
        { note: { contains: "Advance payment" } },
      ],
    },
  });
  const legacyAdvance = advanceRows > 0 ? 0 : money(invoice.advancePayment || 0);
  return {
    paymentsSum,
    legacyAdvance,
    cashApplied: money(paymentsSum + legacyAdvance),
  };
}

export function computeRemaining(grandTotal: number, cashApplied: number) {
  return Math.max(0, money(grandTotal - cashApplied));
}

export async function ensureAdvancePaymentRow(params: {
  tx: TxClient;
  clientId: string;
  invoiceId: string;
  amount: number;
  paymentDate?: Date;
  note?: string;
}) {
  const amount = money(params.amount);
  if (amount <= 0) return null;

  const existing = await params.tx.payment.findFirst({
    where: {
      invoiceId: params.invoiceId,
      OR: [
        { paymentMethod: "Advance" },
        { note: { contains: "Advance payment" } },
      ],
    },
  });

  if (existing) {
    if (money(existing.amount) === amount) return existing;
    return params.tx.payment.update({
      where: { id: existing.id },
      data: { amount, paymentDate: params.paymentDate || existing.paymentDate },
    });
  }

  return params.tx.payment.create({
    data: {
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      amount,
      paymentMethod: "Advance",
      paymentDate: params.paymentDate || new Date(),
      note: params.note || "Advance payment on invoice",
    },
  });
}

export async function applyPaymentToInvoice(params: {
  tx: TxClient;
  invoiceId: string;
  amount: number;
  currentInvoiceStatus?: string;
}) {
  const invoice = await params.tx.invoice.findUnique({ where: { id: params.invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.invoiceStatus === "DRAFT" || invoice.invoiceStatus === "CANCELLED") {
    throw new Error("Cannot apply payment to draft or cancelled invoice");
  }

  const payAmount = money(params.amount);
  if (payAmount <= 0) throw new Error("Payment amount must be positive");
  if (payAmount > money(invoice.remainingBalance) + 0.001) {
    throw new Error(
      `Payment exceeds invoice balance. Remaining: Rs. ${money(invoice.remainingBalance).toFixed(2)}`
    );
  }

  const remaining = Math.max(0, money(invoice.remainingBalance - payAmount));
  const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
    remaining,
    invoice.grandTotal,
    false,
    params.currentInvoiceStatus || invoice.invoiceStatus
  );

  return params.tx.invoice.update({
    where: { id: invoice.id },
    data: {
      remainingBalance: remaining,
      invoiceStatus,
      paymentStatus,
    },
  });
}

/**
 * Record a customer payment. Always creates Payment row(s) linked to invoice(s).
 * Unallocated payments are FIFO-split into per-invoice Payment rows.
 */
export async function recordCustomerPayment(params: {
  tx: TxClient;
  clientId: string;
  amount: number;
  invoiceId?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  paymentDate?: Date;
}) {
  const amount = money(params.amount);
  if (amount <= 0) throw new Error("Payment amount must be positive");

  const client = await params.tx.client.findUnique({ where: { id: params.clientId } });
  if (!client) throw new Error("Client not found");

  const outstanding = await sumClientOutstanding(params.clientId, params.tx);
  if (amount > outstanding + 0.001) {
    throw new Error(
      `Payment exceeds outstanding balance. Outstanding: Rs. ${outstanding.toFixed(2)}`
    );
  }

  const createdPayments: { id: string; invoiceId: string | null; amount: number }[] = [];

  if (params.invoiceId) {
    const invoice = await params.tx.invoice.findUnique({ where: { id: params.invoiceId } });
    if (!invoice || invoice.clientId !== params.clientId) {
      throw new Error("Invoice not found for this client");
    }
    await applyPaymentToInvoice({
      tx: params.tx,
      invoiceId: params.invoiceId,
      amount,
    });
    const payment = await params.tx.payment.create({
      data: {
        clientId: params.clientId,
        invoiceId: params.invoiceId,
        amount,
        paymentMethod: params.paymentMethod || null,
        note: params.note || null,
        paymentDate: params.paymentDate || new Date(),
      },
    });
    createdPayments.push({ id: payment.id, invoiceId: payment.invoiceId, amount: payment.amount });
  } else {
    let remaining = amount;
    const unpaidInvoices = await params.tx.invoice.findMany({
      where: {
        clientId: params.clientId,
        remainingBalance: { gt: 0 },
        invoiceStatus: { notIn: ["DRAFT", "CANCELLED"] },
      },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
    });

    for (const invoice of unpaidInvoices) {
      if (remaining <= 0) break;
      const payAmount = money(Math.min(remaining, invoice.remainingBalance));
      if (payAmount <= 0) continue;

      await applyPaymentToInvoice({
        tx: params.tx,
        invoiceId: invoice.id,
        amount: payAmount,
      });

      const payment = await params.tx.payment.create({
        data: {
          clientId: params.clientId,
          invoiceId: invoice.id,
          amount: payAmount,
          paymentMethod: params.paymentMethod || null,
          note: params.note || null,
          paymentDate: params.paymentDate || new Date(),
        },
      });
      createdPayments.push({ id: payment.id, invoiceId: payment.invoiceId, amount: payment.amount });
      remaining = money(remaining - payAmount);
    }

    if (remaining > 0.001) {
      throw new Error("Could not fully allocate payment to open invoices");
    }
  }

  const newOutstanding = await syncClientCreditBalance(params.clientId, params.tx);
  return { payments: createdPayments, outstanding: newOutstanding };
}

export async function reverseGrowthSavingsIfNeeded(params: {
  tx: TxClient;
  expenseId: string;
  expenseNumber: string;
  amount: number;
}) {
  const existing = await params.tx.savingsTransaction.findFirst({
    where: { expenseId: params.expenseId, type: "GROWTH_EXPENSE_OUT" },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) return null;

  const alreadyReversed = await params.tx.savingsTransaction.findFirst({
    where: {
      expenseId: params.expenseId,
      type: "GROWTH_EXPENSE_REVERSAL",
    },
  });
  if (alreadyReversed) return alreadyReversed;

  const last = await params.tx.savingsTransaction.findFirst({ orderBy: { createdAt: "desc" } });
  const current = money(last?.balanceAfter ?? 0);
  const amount = money(Math.abs(params.amount || existing.amount));
  const balanceAfter = money(current + amount);

  return params.tx.savingsTransaction.create({
    data: {
      type: "GROWTH_EXPENSE_REVERSAL",
      amount,
      balanceAfter,
      reference: params.expenseNumber,
      notes: `Reversal of growth expense ${params.expenseNumber}`,
      expenseId: params.expenseId,
    },
  });
}

export async function postGrowthSavingsOut(params: {
  tx: TxClient;
  expenseId: string;
  expenseNumber: string;
  amount: number;
}) {
  const amount = money(params.amount);
  const last = await params.tx.savingsTransaction.findFirst({ orderBy: { createdAt: "desc" } });
  const current = money(last?.balanceAfter ?? 0);
  if (amount > current + 0.001) {
    throw new Error(
      `Insufficient savings balance. Available: Rs. ${current.toFixed(2)}, Required: Rs. ${amount.toFixed(2)}`
    );
  }
  const balanceAfter = money(current - amount);
  return params.tx.savingsTransaction.create({
    data: {
      type: "GROWTH_EXPENSE_OUT",
      amount: -amount,
      balanceAfter,
      reference: params.expenseNumber,
      notes: `Growth expense ${params.expenseNumber}`,
      expenseId: params.expenseId,
    },
  });
}

/** One-time / on-demand repair for denormalized AR */
export async function repairAllClientCreditBalances(tx: TxClient | typeof prisma = prisma) {
  const clients = await tx.client.findMany({ select: { id: true } });
  for (const client of clients) {
    await syncClientCreditBalance(client.id, tx);
  }
  return clients.length;
}
