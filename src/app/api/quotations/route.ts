import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateQuotationNumber, calculateItemTotal } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { sendQuotationCreatedSms } from "@/lib/sms";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const quotations = await prisma.quotation.findMany({
    include: {
      client: { select: { id: true, clientId: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotations);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const isDraft = !!body.isDraft;
    const quotationNumber = await generateQuotationNumber();
    const items = body.items.map((item: { itemName: string; price: number; quantity: number }) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const grandTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        clientId: body.clientId,
        quotationDate: new Date(body.quotationDate),
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        reference: body.reference || null,
        notes: body.notes || null,
        status: isDraft ? "DRAFT" : "PENDING",
        grandTotal,
        items: { create: items },
      },
      include: { client: true, items: true },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: isDraft ? "CREATE_DRAFT" : "CREATE",
      entityType: "Quotation",
      entityId: quotation.id,
      details: quotation.quotationNumber,
    });

    let sms: Awaited<ReturnType<typeof sendQuotationCreatedSms>> | undefined;
    if (!isDraft) {
      sms = await sendQuotationCreatedSms(quotation);
      if (sms.sent || (!sms.skipped && !sms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: sms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Quotation",
          entityId: quotation.id,
          details: sms.message,
        });
      }
    }

    return NextResponse.json({ ...quotation, sms }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
