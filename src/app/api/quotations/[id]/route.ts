import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { calculateItemTotal } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { client: true, items: true, attachments: true },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  return NextResponse.json(quotation);
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

    const items = body.items.map((item: { itemName: string; price: number; quantity: number }) => ({
      itemName: item.itemName,
      price: item.price,
      quantity: item.quantity,
      total: calculateItemTotal(item.price, item.quantity),
    }));

    const grandTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        clientId: body.clientId,
        quotationDate: new Date(body.quotationDate),
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        reference: body.reference || null,
        notes: body.notes || null,
        status: isDraft ? "DRAFT" : body.status === "CONVERTED" ? "CONVERTED" : "PENDING",
        grandTotal,
        items: { create: items },
      },
      include: { client: true, items: true },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: isDraft ? "UPDATE_DRAFT" : "UPDATE",
      entityType: "Quotation",
      entityId: id,
      details: quotation.quotationNumber,
    });

    return NextResponse.json(quotation);
  } catch {
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
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
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    await prisma.quotation.delete({ where: { id } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "DELETE",
      entityType: "Quotation",
      entityId: id,
      details: quotation.quotationNumber,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
