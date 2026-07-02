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

    const { subTotal, grandTotal, remainingBalance } = calculateInvoiceTotals(
      items,
      body.discount || 0,
      isDraft ? 0 : body.advancePayment || 0
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
          advancePayment: isDraft ? 0 : body.advancePayment || 0,
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

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
