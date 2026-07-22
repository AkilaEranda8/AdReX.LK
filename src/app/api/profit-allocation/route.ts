import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  allocateProfit,
  calculateProfitSummary,
  getSavingsBalance,
  type PeriodType,
} from "@/lib/profit-allocation";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "month") as PeriodType;
  const view = searchParams.get("view") || "summary";

  if (view === "allocations") {
    const allocations = await prisma.profitAllocation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(allocations);
  }

  if (view === "savings") {
    const transactions = await prisma.savingsTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const balance = await getSavingsBalance();
    return NextResponse.json({ balance, transactions });
  }

  if (view === "history") {
    const history = await prisma.profitCalculationHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(history);
  }

  const summary = await calculateProfitSummary(period);
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const periodType = (body.periodType || "month") as PeriodType;
    const result = await allocateProfit({
      periodType,
      notes: body.notes,
      userId: auth.session.userId,
      userName: auth.session.name,
      force: !!body.force,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to allocate profit";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
