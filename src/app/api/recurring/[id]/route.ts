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

function addFrequency(date: Date, frequency: string) {
  const d = new Date(date);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const recurring = await prisma.recurringInvoice.findUnique({ where: { id } });
    if (!recurring || !recurring.active) {
      return NextResponse.json({ error: "Recurring invoice not found" }, { status: 404 });
    }

    const rawItems = JSON.parse(recurring.itemsJson) as { itemName: string; price: number; quantity: number }[];
    const invoiceNumber = await generateInvoiceNumber();
    const items = rawItems.map((item) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const { subTotal, grandTotal, remainingBalance } = calculateInvoiceTotals(
      items,
      recurring.discount,
      0
    );
    const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(remainingBalance, grandTotal, false);

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: recurring.clientId,
          invoiceDate: new Date(),
          dueDate: addFrequency(new Date(), "monthly"),
          notes: recurring.notes,
          subTotal,
          discount: recurring.discount,
          grandTotal,
          remainingBalance,
          invoiceStatus,
          paymentStatus,
          items: { create: items },
        },
        include: { client: true, items: true },
      });

      if (remainingBalance > 0) {
        await tx.client.update({
          where: { id: recurring.clientId },
          data: { creditBalance: { increment: remainingBalance } },
        });
      }

      await tx.recurringInvoice.update({
        where: { id },
        data: { nextDate: addFrequency(recurring.nextDate, recurring.frequency) },
      });

      return inv;
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "GENERATE",
      entityType: "RecurringInvoice",
      entityId: id,
      details: invoice.invoiceNumber,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await prisma.recurringInvoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const item = await prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
      include: { client: { select: { name: true, clientId: true } } },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE",
      entityType: "RecurringInvoice",
      entityId: id,
      details: body.active ? "Resumed" : "Paused",
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
