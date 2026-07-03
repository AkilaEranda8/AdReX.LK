import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { syncInvoiceStatuses } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { sendPaymentReceivedSms } from "@/lib/sms";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const clients = await prisma.client.findMany({
    where: { creditBalance: { gt: 0 } },
    include: {
      invoices: {
        where: { remainingBalance: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { name: "asc" },
  });

  const credits = clients.map((client) => {
    const totalInvoiced = client.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const outstanding = client.creditBalance;
    const paidAmount = totalInvoiced - outstanding;

    return {
      ...client,
      totalCredit: totalInvoiced,
      paidAmount: Math.max(0, paidAmount),
      outstandingBalance: outstanding,
    };
  });

  return NextResponse.json(credits);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { clientId, invoiceId, amount, note } = body;

    if (!clientId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId,
          invoiceId: invoiceId || null,
          amount,
          paymentMethod: body.paymentMethod || null,
          note,
        },
      });

      await tx.client.update({
        where: { id: clientId },
        data: { creditBalance: { decrement: amount } },
      });

      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice) {
          const newRemaining = Math.round((invoice.remainingBalance - amount) * 100) / 100;
          const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
            Math.max(0, newRemaining),
            invoice.grandTotal,
            false,
            invoice.invoiceStatus
          );
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              remainingBalance: Math.max(0, newRemaining),
              invoiceStatus,
              paymentStatus,
            },
          });
        }
      } else {
        let remaining = amount;
        const unpaidInvoices = await tx.invoice.findMany({
          where: { clientId, remainingBalance: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });

        for (const invoice of unpaidInvoices) {
          if (remaining <= 0) break;
          const payAmount = Math.min(remaining, invoice.remainingBalance);
          const newRemaining = Math.round((invoice.remainingBalance - payAmount) * 100) / 100;
          const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
            newRemaining,
            invoice.grandTotal,
            false,
            invoice.invoiceStatus
          );
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { remainingBalance: newRemaining, invoiceStatus, paymentStatus },
          });
          remaining -= payAmount;
        }
      }

      return payment;
    });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    let invoiceNumber = "your account";
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true },
      });
      if (invoice?.invoiceNumber) invoiceNumber = invoice.invoiceNumber;
    }

    let sms: Awaited<ReturnType<typeof sendPaymentReceivedSms>> | undefined;
    if (client) {
      sms = await sendPaymentReceivedSms({
        client,
        amount,
        invoiceNumber,
      });
      if (sms.sent || (!sms.skipped && !sms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: sms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Payment",
          entityId: result.id,
          details: sms.message,
        });
      }
    }

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "Payment",
      entityId: result.id,
      details: `Rs. ${amount}`,
    });

    return NextResponse.json({ ...result, sms }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
