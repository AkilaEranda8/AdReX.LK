import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { resolveExpenseKind } from "@/lib/expense-categories";
import {
  money,
  postGrowthSavingsOut,
  reverseGrowthSavingsIfNeeded,
} from "@/lib/accounts";

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
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const expenseKind = resolveExpenseKind(body.category, body.expenseKind);
    const nextStatus = (body.status || existing.status) as "PENDING" | "PAID" | "CANCELLED";
    const nextAmount = money(body.amount ?? existing.amount);

    const expense = await prisma.$transaction(async (tx) => {
      const wasGrowthPaid =
        existing.expenseKind === "GROWTH" && existing.status === "PAID";
      const willBeGrowthPaid = expenseKind === "GROWTH" && nextStatus === "PAID";

      if (wasGrowthPaid && (!willBeGrowthPaid || nextAmount !== money(existing.amount))) {
        await reverseGrowthSavingsIfNeeded({
          tx,
          expenseId: existing.id,
          expenseNumber: existing.expenseNumber,
          amount: existing.amount,
        });
      }

      if (willBeGrowthPaid && (!wasGrowthPaid || nextAmount !== money(existing.amount))) {
        await postGrowthSavingsOut({
          tx,
          expenseId: existing.id,
          expenseNumber: existing.expenseNumber,
          amount: nextAmount,
        });
      }

      return tx.expense.update({
        where: { id },
        data: {
          expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
          category: body.category,
          vendor: body.vendor ?? undefined,
          description: body.description,
          amount: nextAmount,
          paymentMethod: body.paymentMethod ?? undefined,
          reference: body.reference ?? undefined,
          notes: body.notes ?? undefined,
          status: nextStatus,
          expenseKind,
        },
      });
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE",
      entityType: "Expense",
      entityId: expense.id,
      details: `${expense.expenseNumber} · ${expenseKind}`,
    });

    return NextResponse.json(expense);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update expense";
    return NextResponse.json({ error: message }, { status: 400 });
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
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (existing.expenseKind === "GROWTH" && existing.status === "PAID") {
        await reverseGrowthSavingsIfNeeded({
          tx,
          expenseId: existing.id,
          expenseNumber: existing.expenseNumber,
          amount: existing.amount,
        });
      }
      await tx.expense.delete({ where: { id } });
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "DELETE",
      entityType: "Expense",
      entityId: id,
      details: existing.expenseNumber,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
