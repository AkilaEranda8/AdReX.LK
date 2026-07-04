import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateExpenseNumber } from "@/lib/numbering";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const expenses = await prisma.expense.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "PAID" | "CANCELLED" } : {}),
      ...(category ? { category } : {}),
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
    const { category, vendor, description, amount, paymentMethod, reference, notes, status, expenseDate } = body;

    if (!category || !description || !amount || amount <= 0) {
      return NextResponse.json({ error: "Category, description, and amount are required" }, { status: 400 });
    }

    const expenseNumber = await generateExpenseNumber();

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
        status: status || "PAID",
      },
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      details: `${expenseNumber} · Rs. ${amount}`,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
