import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(expense);
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

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
        category: body.category,
        vendor: body.vendor ?? undefined,
        description: body.description,
        amount: body.amount,
        paymentMethod: body.paymentMethod ?? undefined,
        reference: body.reference ?? undefined,
        notes: body.notes ?? undefined,
        status: body.status,
      },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expense.id,
      details: expense.expenseNumber,
    });

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
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
    const expense = await prisma.expense.delete({ where: { id } });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "DELETE",
      entityType: "Expense",
      entityId: id,
      details: expense.expenseNumber,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
