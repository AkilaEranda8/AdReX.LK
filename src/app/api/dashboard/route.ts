import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));

  const [
    totalClients,
    clientsThisMonth,
    totalInvoices,
    invoicesThisMonth,
    totalQuotations,
    quotationsThisMonth,
    creditAgg,
    allInvoices,
    recentInvoices,
    recentQuotations,
    paymentsAgg,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.quotation.count(),
    prisma.quotation.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.client.aggregate({ _sum: { creditBalance: true } }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        invoiceStatus: true,
        paymentStatus: true,
        invoiceDate: true,
        createdAt: true,
        dueDate: true,
        remainingBalance: true,
      },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.quotation.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  const totalSales = allInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const salesThisMonth = allInvoices
    .filter((inv) => new Date(inv.createdAt) >= thisMonthStart)
    .reduce((sum, inv) => sum + inv.grandTotal, 0);
  const salesLastMonth = allInvoices
    .filter((inv) => {
      const d = new Date(inv.createdAt);
      return d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const salesTrend =
    salesLastMonth > 0
      ? Math.round(((salesThisMonth - salesLastMonth) / salesLastMonth) * 100)
      : salesThisMonth > 0
        ? 100
        : 0;

  const outstandingCredit = creditAgg._sum.creditBalance || 0;
  const totalReceived = paymentsAgg._sum.amount || 0;
  const totalCreditSales = totalReceived + outstandingCredit;

  const overdueInvoices = allInvoices.filter(
    (i) =>
      i.dueDate &&
      i.paymentStatus !== "PAID" &&
      i.invoiceStatus !== "DRAFT" &&
      i.invoiceStatus !== "CANCELLED" &&
      new Date(i.dueDate) < now
  );

  const statusCounts = {
    paid: allInvoices.filter((i) => i.paymentStatus === "PAID").length,
    partiallyPaid: allInvoices.filter((i) => i.paymentStatus === "PARTIALLY_PAID").length,
    pending: allInvoices.filter((i) => i.paymentStatus === "UNPAID").length,
    draft: allInvoices.filter((i) => i.invoiceStatus === "DRAFT").length,
    overdue: overdueInvoices.length,
  };

  const daysInMonth = endOfMonth(now).getDate();
  const salesOverview = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const label = `${now.toLocaleString("en", { month: "short" })} ${day}`;

    const thisDaySales = allInvoices
      .filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return (
          d.getFullYear() === date.getFullYear() &&
          d.getMonth() === date.getMonth() &&
          d.getDate() === day
        );
      })
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    const lastDaySales = allInvoices
      .filter((inv) => {
        const d = new Date(inv.invoiceDate);
        const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, day);
        return (
          d.getFullYear() === lastDate.getFullYear() &&
          d.getMonth() === lastDate.getMonth() &&
          d.getDate() === day
        );
      })
      .reduce((sum, inv) => sum + inv.grandTotal, 0);

    return { label, thisMonth: thisDaySales, lastMonth: lastDaySales };
  });

  const sparkline = (base: number) =>
    Array.from({ length: 7 }, (_, i) => Math.max(1, Math.round(base * (0.6 + (i / 6) * 0.4))));

  return NextResponse.json({
    user: { name: auth.session.name, role: auth.session.role },
    stats: {
      totalClients,
      clientsTrend: clientsThisMonth,
      totalInvoices,
      invoicesTrend: invoicesThisMonth,
      totalQuotations,
      quotationsTrend: quotationsThisMonth,
      totalSales,
      salesTrend,
      outstandingCredit,
      creditTrend: -5,
    },
    sparklines: {
      clients: sparkline(totalClients),
      invoices: sparkline(totalInvoices),
      quotations: sparkline(totalQuotations),
      sales: sparkline(totalSales / 10000),
      credit: sparkline(outstandingCredit / 10000),
    },
    salesOverview,
    invoiceStatus: statusCounts,
    creditSummary: {
      totalCreditSales,
      totalReceived,
      outstandingBalance: outstandingCredit,
    },
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      client: inv.client.name,
      date: inv.invoiceDate,
      amount: inv.grandTotal,
      status: inv.invoiceStatus,
      payment:
        inv.paymentStatus === "PAID"
          ? "Paid"
          : inv.paymentStatus === "PARTIALLY_PAID"
            ? "Partial"
            : inv.paymentStatus === "UNPAID"
              ? "Unpaid"
              : "—",
    })),
    recentQuotations: recentQuotations.map((q) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      client: q.client.name,
      date: q.quotationDate,
      amount: q.grandTotal,
      status: q.status,
    })),
    overdueInvoices: overdueInvoices.slice(0, 5).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      remainingBalance: i.remainingBalance,
      dueDate: i.dueDate,
    })),
  });
}
