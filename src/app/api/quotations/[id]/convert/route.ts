import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  syncInvoiceStatuses,
} from "@/lib/numbering";
import { sendInvoiceCreatedSms } from "@/lib/sms";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const items = quotation.items.map((item) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
    }));

    const { subTotal, grandTotal, remainingBalance } = calculateInvoiceTotals(items, 0, 0);
    const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(remainingBalance, grandTotal, false);

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: quotation.clientId,
          invoiceDate: new Date(),
          subTotal,
          discount: 0,
          advancePayment: 0,
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
          where: { id: quotation.clientId },
          data: { creditBalance: { increment: remainingBalance } },
        });
      }

      return inv;
    });

    await prisma.quotation.update({
      where: { id },
      data: { status: "CONVERTED" },
    });

    const sms = await sendInvoiceCreatedSms(invoice);

    return NextResponse.json({ ...invoice, sms }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to convert quotation" }, { status: 500 });
  }
}
