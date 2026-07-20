import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  generateInvoiceNumber,
  calculateItemTotal,
  calculateInvoiceTotals,
  syncInvoiceStatuses,
} from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { sendInvoiceCreatedSms, sendInvoiceAdvancePaymentSms } from "@/lib/sms";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const invoiceStatus = searchParams.get("invoiceStatus") || searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(invoiceStatus
        ? { invoiceStatus: invoiceStatus as "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED" }
        : {}),
      ...(paymentStatus
        ? { paymentStatus: paymentStatus as "UNPAID" | "PARTIALLY_PAID" | "PAID" }
        : {}),
    },
    include: {
      client: { select: { id: true, clientId: true, name: true, contactNumber: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const isDraft = !!body.isDraft;
    const invoiceNumber = await generateInvoiceNumber();
    const items = body.items.map((item: { itemName: string; price: number; quantity: number }) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const advancePayment = body.advancePayment || 0;
    const { subTotal, grandTotal, remainingBalance } = calculateInvoiceTotals(
      items,
      body.discount || 0,
      advancePayment
    );

    const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
      isDraft ? 0 : remainingBalance,
      grandTotal,
      isDraft
    );

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: body.clientId,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          reference: body.reference || null,
          notes: body.notes || null,
          taxRate: body.taxRate || 0,
          subTotal,
          discount: body.discount || 0,
          advancePayment,
          grandTotal,
          remainingBalance: isDraft ? 0 : remainingBalance,
          invoiceStatus,
          paymentStatus,
          items: { create: items },
        },
        include: { client: true, items: true },
      });

      if (!isDraft && remainingBalance > 0) {
        await tx.client.update({
          where: { id: body.clientId },
          data: { creditBalance: { increment: remainingBalance } },
        });
      }

      return inv;
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: isDraft ? "CREATE_DRAFT" : "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      details: invoice.invoiceNumber,
    });

    let sms: Awaited<ReturnType<typeof sendInvoiceCreatedSms>> | undefined;
    let paymentSms: Awaited<ReturnType<typeof sendInvoiceAdvancePaymentSms>> | undefined;
    if (!isDraft) {
      sms = await sendInvoiceCreatedSms(invoice);
      if (sms.sent || (!sms.skipped && !sms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: sms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Invoice",
          entityId: invoice.id,
          details: sms.message,
        });
      }

      if (invoice.advancePayment > 0) {
        paymentSms = await sendInvoiceAdvancePaymentSms(invoice);
        if (paymentSms && (paymentSms.sent || (!paymentSms.skipped && !paymentSms.sent))) {
          await logAudit({
            userId: auth.session.userId,
            userName: auth.session.name,
            action: paymentSms.sent ? "SMS_SENT" : "SMS_FAILED",
            entityType: "Invoice",
            entityId: invoice.id,
            details: `Advance payment: ${paymentSms.message}`,
          });
        }
      }
    }

    return NextResponse.json({ ...invoice, sms, paymentSms }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
