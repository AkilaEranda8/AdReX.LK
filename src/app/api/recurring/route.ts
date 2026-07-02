import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const items = await prisma.recurringInvoice.findMany({
    include: { client: { select: { id: true, name: true, clientId: true } } },
    orderBy: { nextDate: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const item = await prisma.recurringInvoice.create({
      data: {
        clientId: body.clientId,
        frequency: body.frequency,
        nextDate: new Date(body.nextDate),
        dayOfMonth: body.dayOfMonth || null,
        itemsJson: JSON.stringify(body.items),
        discount: body.discount || 0,
        notes: body.notes || null,
        active: body.active !== false,
      },
      include: { client: { select: { name: true, clientId: true } } },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "RecurringInvoice",
      entityId: item.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create recurring invoice" }, { status: 500 });
  }
}
