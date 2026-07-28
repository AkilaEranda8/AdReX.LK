import { prisma } from "./prisma";
import { getCompanySettings, type ProfitAllocationSettings } from "./settings";
import { generateAllocationNumber } from "./numbering";
import { logAudit } from "./audit";

export type PeriodType = "day" | "week" | "month" | "year" | "all";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function getPeriodRange(period: PeriodType, now = new Date()) {
  if (period === "day") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = startOfDay(new Date(now));
    start.setDate(start.getDate() - diff);
    const end = endOfDay(new Date(start));
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  if (period === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === "year") {
    return {
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }
  return { start: new Date(2000, 0, 1), end: endOfDay(now) };
}

export async function getSavingsBalance(): Promise<number> {
  const last = await prisma.savingsTransaction.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return last?.balanceAfter ?? 0;
}

export async function calculateProfitSummary(period: PeriodType) {
  const { start, end } = getPeriodRange(period);
  const settings = await getCompanySettings();
  const pa = settings.profitAllocation!;

  const [invoices, expenses, allocations] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: start, lte: end },
        invoiceStatus: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: { grandTotal: true, remainingBalance: true },
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: { gte: start, lte: end },
        status: "PAID",
      },
    }),
    prisma.profitAllocation.findMany({
      where: {
        periodStart: { gte: start },
        periodEnd: { lte: end },
        status: "COMPLETED",
      },
    }),
  ]);

  // Gross invoiced (accrual) vs outstanding not yet collected.
  const invoicedIncome = Math.round(invoices.reduce((s, i) => s + i.grandTotal, 0) * 100) / 100;
  const outstanding =
    Math.round(invoices.reduce((s, i) => s + Math.max(0, i.remainingBalance), 0) * 100) / 100;
  // Only collected cash counts toward allocatable income.
  const totalIncome = Math.round((invoicedIncome - outstanding) * 100) / 100;
  const operationalExpenses =
    Math.round(
      expenses.filter((e) => e.expenseKind === "OPERATIONAL").reduce((s, e) => s + e.amount, 0) * 100
    ) / 100;
  const growthExpenses =
    Math.round(
      expenses.filter((e) => e.expenseKind === "GROWTH").reduce((s, e) => s + e.amount, 0) * 100
    ) / 100;
  // Live gross profit for the period (before prior allocations).
  const profit = Math.round((totalIncome - operationalExpenses) * 100) / 100;

  const allocatedOperating =
    Math.round(allocations.reduce((s, a) => s + a.operatingAmount, 0) * 100) / 100;
  const allocatedSavings =
    Math.round(allocations.reduce((s, a) => s + a.savingsAmount, 0) * 100) / 100;
  // Prefer stored profit; fall back to op+sav for older rows.
  const alreadyAllocated =
    Math.round(
      allocations.reduce((s, a) => s + (a.profit || a.operatingAmount + a.savingsAmount), 0) * 100
    ) / 100;
  // Remaining profit that can still be split (live after new cash / expenses / prior allocates).
  const availableProfit = Math.round(Math.max(0, profit - alreadyAllocated) * 100) / 100;
  const savingsBalance = await getSavingsBalance();

  const suggestedOperating =
    Math.round(((availableProfit * pa.operatingPercent) / 100) * 100) / 100;
  const suggestedSavings =
    Math.round(((availableProfit * pa.savingsPercent) / 100) * 100) / 100;

  return {
    period,
    periodStart: start,
    periodEnd: end,
    totalIncome,
    invoicedIncome,
    outstanding,
    operationalExpenses,
    growthExpenses,
    profit,
    alreadyAllocated,
    availableProfit,
    allocatedOperating,
    allocatedSavings,
    savingsBalance,
    lowSavings: savingsBalance < pa.lowSavingsWarning,
    settings: pa,
    suggested: {
      operatingAmount: Math.max(0, suggestedOperating),
      savingsAmount: Math.max(0, suggestedSavings),
      operatingPercent: pa.operatingPercent,
      savingsPercent: pa.savingsPercent,
    },
  };
}

export async function allocateProfit(params: {
  periodType: PeriodType;
  notes?: string;
  userId: string;
  userName: string;
  force?: boolean;
}) {
  const settings = await getCompanySettings();
  const pa = settings.profitAllocation!;

  if (!pa.enabled && !params.force) {
    throw new Error("Profit allocation is disabled in settings");
  }

  if (Math.round(pa.operatingPercent + pa.savingsPercent) !== 100) {
    throw new Error("Operating and savings percentages must total 100%");
  }

  const summary = await calculateProfitSummary(params.periodType);
  if (summary.availableProfit <= 0) {
    throw new Error(
      summary.alreadyAllocated > 0
        ? "No new profit available — current collected profit is already fully allocated"
        : "No profit available to allocate for this period"
    );
  }

  // Incremental allocate: more than one COMPLETED row per period is OK when new cash arrives.
  const operatingAmount = summary.suggested.operatingAmount;
  const savingsAmount = summary.suggested.savingsAmount;
  const allocationProfit = summary.availableProfit;
  const allocationNumber = await generateAllocationNumber();
  const currentBalance = await getSavingsBalance();
  const balanceAfter = Math.round((currentBalance + savingsAmount) * 100) / 100;

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.profitAllocation.create({
      data: {
        allocationNumber,
        periodType: params.periodType,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        totalIncome: summary.totalIncome,
        operationalExpenses: summary.operationalExpenses,
        profit: allocationProfit,
        operatingPercent: pa.operatingPercent,
        savingsPercent: pa.savingsPercent,
        operatingAmount,
        savingsAmount,
        operatingBank: pa.operatingBank,
        savingsBank: pa.savingsBank,
        notes: params.notes || null,
        status: "COMPLETED",
      },
    });

    await tx.savingsTransaction.create({
      data: {
        type: "ALLOCATION_IN",
        amount: savingsAmount,
        balanceAfter,
        reference: allocationNumber,
        notes: `${pa.savingsPercent}% of available profit → ${pa.savingsBank}`,
        allocationId: allocation.id,
      },
    });

    await tx.profitCalculationHistory.create({
      data: {
        periodType: params.periodType,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        totalIncome: summary.totalIncome,
        operationalExpenses: summary.operationalExpenses,
        profit: allocationProfit,
        allocated: true,
        allocationId: allocation.id,
      },
    });

    return allocation;
  });

  await logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "ALLOCATED",
    entityType: "ProfitAllocation",
    entityId: result.id,
    details: `${allocationNumber} · Available Rs. ${allocationProfit} → Op ${operatingAmount} / Sav ${savingsAmount}`,
  });

  return {
    allocation: result,
    savingsBalance: balanceAfter,
    summary,
  };
}

export async function recordGrowthExpenseAgainstSavings(params: {
  expenseId: string;
  amount: number;
  expenseNumber: string;
  userId: string;
  userName: string;
}) {
  const balance = await getSavingsBalance();
  if (params.amount > balance) {
    throw new Error(
      `Insufficient savings balance. Available: Rs. ${balance.toFixed(2)}, Required: Rs. ${params.amount.toFixed(2)}`
    );
  }

  const balanceAfter = Math.round((balance - params.amount) * 100) / 100;

  const tx = await prisma.savingsTransaction.create({
    data: {
      type: "GROWTH_EXPENSE_OUT",
      amount: -params.amount,
      balanceAfter,
      reference: params.expenseNumber,
      notes: `Growth expense ${params.expenseNumber}`,
      expenseId: params.expenseId,
    },
  });

  await logAudit({
    userId: params.userId,
    userName: params.userName,
    action: "TRANSFERRED",
    entityType: "SavingsTransaction",
    entityId: tx.id,
    details: `Growth expense ${params.expenseNumber} · -Rs. ${params.amount}`,
  });

  return { transaction: tx, savingsBalance: balanceAfter };
}

export function validateAllocationPercents(settings: ProfitAllocationSettings) {
  const total = Math.round((settings.operatingPercent + settings.savingsPercent) * 100) / 100;
  if (total !== 100) {
    return "Operating and savings percentages must equal 100%";
  }
  if (settings.operatingPercent < 0 || settings.savingsPercent < 0) {
    return "Percentages cannot be negative";
  }
  return null;
}
