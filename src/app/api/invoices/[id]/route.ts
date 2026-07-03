import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  calculateItemTotal,
  calculateInvoiceTotals,
  syncInvoiceStatuses,
} from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { sendInvoiceCreatedSms } from "@/lib/sms";

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

    const items = body.items.map((item: { itemName: string; price: number; quantity: number }) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const { subTotal, grandTotal, remainingBalance } = calculateInvoiceTotals(
      items,
      body.discount || 0,
      isDraft ? 0 : body.advancePayment || 0
    );

    const totalPayments = await prisma.payment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });
    const paymentsSum = totalPayments._sum.amount || 0;
    const newRemaining = isDraft
      ? 0
      : Math.round((grandTotal - (body.advancePayment || 0) - paymentsSum) * 100) / 100;
    const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
      newRemaining,
      grandTotal,
      isDraft,
      existing.invoiceStatus
    );

    const wasDraft = existing.invoiceStatus === "DRAFT";

    const invoice = await prisma.$transaction(async (tx) => {
      const creditDiff = isDraft ? 0 : newRemaining - (wasDraft ? 0 : existing.remainingBalance);

      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      const inv = await tx.invoice.update({
        where: { id },
        data: {
          clientId: body.clientId,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          reference: body.reference || null,
          notes: body.notes || null,
          taxRate: body.taxRate || 0,
          subTotal,
          discount: body.discount || 0,
          advancePayment: isDraft ? 0 : body.advancePayment || 0,
          grandTotal,
          remainingBalance: newRemaining,
          invoiceStatus,
          paymentStatus,
          items: { create: items },
        },
        include: { client: true, items: true },
      });

      if (creditDiff !== 0) {
        await tx.client.update({
          where: { id: body.clientId },
          data: { creditBalance: { increment: creditDiff } },
        });
      }

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

    return NextResponse.json({ ...invoice, sms });
  } catch {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
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
      if (invoice.remainingBalance > 0 && invoice.invoiceStatus !== "DRAFT") {
        await tx.client.update({
          where: { id: invoice.clientId },
          data: { creditBalance: { decrement: invoice.remainingBalance } },
        });
      }
      await tx.invoice.delete({ where: { id } });
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
