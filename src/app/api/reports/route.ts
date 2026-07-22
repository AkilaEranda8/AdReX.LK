import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function inPeriod(date: Date, period: string, now: Date) {
  if (period === "all") return true;
  if (period === "month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return Math.floor(date.getMonth() / 3) === q && date.getFullYear() === now.getFullYear();
  }
  if (period === "year") return date.getFullYear() === now.getFullYear();
  return true;
}

function buildSalesTrend(
  invoices: { invoiceDate: Date; grandTotal: number; invoiceStatus: string }[],
  payments: { paymentDate: Date; amount: number }[],
  period: string,
  now: Date
) {
  if (period === "month") {
    const daysInMonth = endOfMonth(now).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const sales = invoices
        .filter((inv) => {
          const d = new Date(inv.invoiceDate);
          return (
            inv.invoiceStatus !== "DRAFT" &&
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === day
          );
        })
        .reduce((s, inv) => s + inv.grandTotal, 0);

      const collected = payments
        .filter((p) => {
          const d = new Date(p.paymentDate);
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === day
          );
        })
        .reduce((s, p) => s + p.amount, 0);

      return { label: String(day), sales, collected };
    });
  }

  const monthCount = period === "quarter" ? 3 : 12;

  if (period === "all") {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = d.toLocaleString("en", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();

      const sales = invoices
        .filter((inv) => {
          const invDate = new Date(inv.invoiceDate);
          return inv.invoiceStatus !== "DRAFT" && invDate.getFullYear() === year && invDate.getMonth() === month;
        })
        .reduce((s, inv) => s + inv.grandTotal, 0);

      const collected = payments
        .filter((p) => {
          const payDate = new Date(p.paymentDate);
          return payDate.getFullYear() === year && payDate.getMonth() === month;
        })
        .reduce((s, p) => s + p.amount, 0);

      return { label, sales, collected };
    });
  }

  const startMonth =
    period === "quarter" ? Math.floor(now.getMonth() / 3) * 3 : 0;
  const startYear = now.getFullYear();

  return Array.from({ length: monthCount }, (_, i) => {
    let month = startMonth + i;
    let year = startYear;
    if (month < 0) {
      month += 12;
      year -= 1;
    } else if (month > 11) {
      month -= 12;
      year += 1;
    }

    const label = new Date(year, month, 1).toLocaleString("en", { month: "short" });

    const sales = invoices
      .filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return inv.invoiceStatus !== "DRAFT" && d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((s, inv) => s + inv.grandTotal, 0);

    const collected = payments
      .filter((p) => {
        const d = new Date(p.paymentDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((s, p) => s + p.amount, 0);

    return { label, sales, collected };
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const now = new Date();

  const [invoices, payments, clients, expenses] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: { select: { name: true, clientId: true } } },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.payment.findMany({
      include: { client: { select: { name: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.client.findMany({
      where: { creditBalance: { gt: 0 } },
      orderBy: { creditBalance: "desc" },
      select: { id: true, clientId: true, name: true, creditBalance: true },
    }),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" } }),
  ]);

  const periodInvoices = invoices.filter(
    (i) => inPeriod(new Date(i.invoiceDate), period, now) && i.invoiceStatus !== "DRAFT"
  );
  const periodPayments = payments.filter((p) => inPeriod(new Date(p.paymentDate), period, now));
  const periodExpenses = expenses.filter(
    (e) => inPeriod(new Date(e.expenseDate), period, now) && e.status !== "CANCELLED"
  );
  const operationalExpenses = periodExpenses.filter(
    (e) => (e as { expenseKind?: string }).expenseKind !== "GROWTH"
  );

  const periodSales = periodInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalOutstanding = clients.reduce((s, c) => s + c.creditBalance, 0);
  const totalCollected = periodPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = operationalExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = periodSales - totalExpenses;

  const overdueInvoices = invoices.filter(
    (i) =>
      i.dueDate &&
      i.paymentStatus !== "PAID" &&
      i.invoiceStatus !== "DRAFT" &&
      i.invoiceStatus !== "CANCELLED" &&
      new Date(i.dueDate) < now
  );

  const scopedInvoices = invoices.filter((i) => inPeriod(new Date(i.invoiceDate), period, now));

  const invoiceStatus = {
    paid: scopedInvoices.filter((i) => i.paymentStatus === "PAID").length,
    partiallyPaid: scopedInvoices.filter((i) => i.paymentStatus === "PARTIALLY_PAID").length,
    pending: scopedInvoices.filter(
      (i) => i.paymentStatus === "UNPAID" || i.paymentStatus === "NONE"
    ).length,
    overdue: scopedInvoices.filter((i) =>
      overdueInvoices.some((o) => o.id === i.id)
    ).length,
  };

  const paymentMethods = periodPayments.reduce<Record<string, number>>((acc, p) => {
    const key = (p.paymentMethod || "Cash").trim() || "Cash";
    acc[key] = (acc[key] || 0) + p.amount;
    return acc;
  }, {});

  const expensesByCategory = operationalExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const charts = {
    salesTrend: buildSalesTrend(invoices, payments, period, now),
    invoiceStatus,
    topClients: clients.slice(0, 6).map((c) => ({
      name: c.name,
      amount: c.creditBalance,
    })),
    paymentMethods: Object.entries(paymentMethods)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    expensesByCategory: Object.entries(expensesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
  };

  return NextResponse.json({
    summary: {
      monthlySales: periodSales,
      totalOutstanding,
      totalCollected,
      totalExpenses,
      netProfit,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((s, i) => s + i.remainingBalance, 0),
    },
    charts,
    overdueInvoices: overdueInvoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      client: i.client.name,
      dueDate: i.dueDate,
      remainingBalance: i.remainingBalance,
    })),
    clientStatements: clients,
    recentPayments: periodPayments.slice(0, 50),
    recentExpenses: periodExpenses.slice(0, 50).map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      expenseDate: e.expenseDate,
      category: e.category,
      vendor: e.vendor,
      description: e.description,
      amount: e.amount,
      status: e.status,
    })),
    period,
  });
}
