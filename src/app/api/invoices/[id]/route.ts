import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  calculateItemTotal,
  calculateInvoiceTotals,
  syncInvoiceStatuses,
} from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { sendInvoiceCreatedSms, sendPaymentReceivedSms } from "@/lib/sms";
import {
  computeRemaining,
  ensureAdvancePaymentRow,
  getInvoiceCashApplied,
  money,
  syncClientCreditBalance,
} from "@/lib/accounts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      attachments: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const isDraft = !!body.isDraft;

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.invoiceStatus === "CANCELLED" && isDraft) {
      return NextResponse.json({ error: "Cancelled invoices cannot become drafts" }, { status: 400 });
    }

    const wasDraft = existing.invoiceStatus === "DRAFT";
    const newAdvance = money(body.advancePayment || 0);
    const previousAdvance = wasDraft ? 0 : money(existing.advancePayment);
    const advanceDelta = isDraft ? 0 : money(newAdvance - previousAdvance);
    const oldClientId = existing.clientId;
    const newClientId = body.clientId || existing.clientId;

    const items = body.items.map((item: { itemName: string; price: number; quantity: number }) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const { subTotal, grandTotal } = calculateInvoiceTotals(
      items,
      body.discount || 0,
      newAdvance
    );

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // Temporarily set advance on invoice for cash-applied helper after payment upsert
      if (!isDraft && newAdvance > 0) {
        await ensureAdvancePaymentRow({
          tx,
          clientId: newClientId,
          invoiceId: id,
          amount: newAdvance,
          paymentDate: new Date(body.invoiceDate || existing.invoiceDate),
        });
      } else if (!isDraft && newAdvance <= 0) {
        // Remove legacy advance payment rows if advance cleared
        await tx.payment.deleteMany({
          where: {
            invoiceId: id,
            OR: [
              { paymentMethod: "Advance" },
              { note: { contains: "Advance payment" } },
            ],
          },
        });
      }

      const cash = isDraft
        ? { cashApplied: 0 }
        : await getInvoiceCashApplied({ id, advancePayment: newAdvance }, tx);

      const newRemaining = isDraft ? 0 : computeRemaining(grandTotal, cash.cashApplied);
      const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
        newRemaining,
        grandTotal,
        isDraft,
        existing.invoiceStatus === "CANCELLED" ? "CANCELLED" : existing.invoiceStatus
      );

      const inv = await tx.invoice.update({
        where: { id },
        data: {
          clientId: newClientId,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          reference: body.reference || null,
          notes: body.notes || null,
          taxRate: body.taxRate || 0,
          subTotal,
          discount: body.discount || 0,
          advancePayment: newAdvance,
          grandTotal,
          remainingBalance: newRemaining,
          invoiceStatus,
          paymentStatus,
          items: { create: items },
        },
        include: { client: true, items: true },
      });

      // Move payment rows if client changed
      if (oldClientId !== newClientId) {
        await tx.payment.updateMany({
          where: { invoiceId: id },
          data: { clientId: newClientId },
        });
        await syncClientCreditBalance(oldClientId, tx);
      }
      await syncClientCreditBalance(newClientId, tx);

      return inv;
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: isDraft ? "UPDATE_DRAFT" : "UPDATE",
      entityType: "Invoice",
      entityId: id,
      details: invoice.invoiceNumber,
    });

    let sms: Awaited<ReturnType<typeof sendInvoiceCreatedSms>> | undefined;
    let paymentSms: Awaited<ReturnType<typeof sendPaymentReceivedSms>> | undefined;

    if (wasDraft && !isDraft) {
      sms = await sendInvoiceCreatedSms(invoice);
      if (sms.sent || (!sms.skipped && !sms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: sms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Invoice",
          entityId: id,
          details: sms.message,
        });
      }
    }

    if (!isDraft && advanceDelta > 0) {
      paymentSms = await sendPaymentReceivedSms({
        client: invoice.client,
        amount: advanceDelta,
        invoiceNumber: `invoice ${invoice.invoiceNumber}`,
        balance: invoice.remainingBalance,
      });
      if (paymentSms.sent || (!paymentSms.skipped && !paymentSms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: paymentSms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Invoice",
          entityId: id,
          details: `Advance payment: ${paymentSms.message}`,
        });
      }
    }

    return NextResponse.json({ ...invoice, sms, paymentSms });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });
      await syncClientCreditBalance(invoice.clientId, tx);
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "DELETE",
      entityType: "Invoice",
      entityId: id,
      details: invoice.invoiceNumber,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
