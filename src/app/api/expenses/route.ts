import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateExpenseNumber } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";
import { resolveExpenseKind } from "@/lib/expense-categories";
import {
  getSavingsBalance,
  recordGrowthExpenseAgainstSavings,
} from "@/lib/profit-allocation";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const kind = searchParams.get("kind");

  const expenses = await prisma.expense.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "PAID" | "CANCELLED" } : {}),
      ...(category ? { category } : {}),
      ...(kind ? { expenseKind: kind as "OPERATIONAL" | "GROWTH" } : {}),
    },
    orderBy: { expenseDate: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      category,
      vendor,
      description,
      amount,
      paymentMethod,
      reference,
      notes,
      status,
      expenseDate,
    } = body;

    if (!category || !description || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Category, description, and amount are required" },
        { status: 400 }
      );
    }

    const expenseKind = resolveExpenseKind(category, body.expenseKind);
    const expenseStatus = status || "PAID";
    const expenseNumber = await generateExpenseNumber();

    if (expenseKind === "GROWTH" && expenseStatus === "PAID") {
      const balance = await getSavingsBalance();
      if (amount > balance) {
        return NextResponse.json(
          {
            error: `Insufficient savings balance. Available: Rs. ${balance.toFixed(2)}. Growth expenses must be paid from company savings.`,
          },
          { status: 400 }
        );
      }
    }

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        category,
        vendor: vendor || null,
        description,
        amount,
        paymentMethod: paymentMethod || null,
        reference: reference || null,
        notes: notes || null,
        status: expenseStatus,
        expenseKind,
      },
    });

    let savingsBalance: number | undefined;
    if (expenseKind === "GROWTH" && expense.status === "PAID") {
      const result = await recordGrowthExpenseAgainstSavings({
        expenseId: expense.id,
        amount: expense.amount,
        expenseNumber: expense.expenseNumber,
        userId: auth.session.userId,
        userName: auth.session.name,
      });
      savingsBalance = result.savingsBalance;
    }

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      details: `${expenseNumber} · ${expenseKind} · Rs. ${amount}`,
    });

    return NextResponse.json({ ...expense, savingsBalance }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
