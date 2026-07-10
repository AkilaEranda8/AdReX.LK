"use client";

import { useEffect, useState } from "react";
import { Calendar, CreditCard, DollarSign, FileSpreadsheet, FileText, Users } from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";
import { CreditSummaryCard } from "@/components/dashboard/credit-summary";
import { RecentInvoicesTable, RecentQuotationsTable } from "@/components/dashboard/recent-tables";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { ClientMonthRangeLabel } from "@/components/ui/client-month-range";
import { appBranding } from "@/lib/company";

interface DashboardData {
  user: { name: string; role: string };
  stats: {
    totalClients: number;
    clientsTrend: number;
    totalInvoices: number;
    invoicesTrend: number;
    totalQuotations: number;
    quotationsTrend: number;
    totalSales: number;
    salesTrend: number;
    outstandingCredit: number;
    creditTrend: number;
  };
  sparklines: {
    clients: number[];
    invoices: number[];
    quotations: number[];
    sales: number[];
    credit: number[];
  };
  salesOverview: { label: string; thisMonth: number; lastMonth: number }[];
  invoiceStatus: { paid: number; partiallyPaid: number; pending: number; overdue: number };
  creditSummary: { totalCreditSales: number; totalReceived: number; outstandingBalance: number };
  recentInvoices: {
    id: string;
    invoiceNumber: string;
    client: string;
    date: string;
    amount: number;
    status: string;
    payment: string;
  }[];
  recentQuotations: {
    id: string;
    quotationNumber: string;
    client: string;
    date: string;
    amount: number;
    status: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const stats = data?.stats;
  const firstName = data?.user.name.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6 bg-background p-4 lg:p-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg border-slate-200 bg-white text-sm font-normal shadow-sm"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <ClientMonthRangeLabel />
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Clients"
            value={stats?.totalClients ?? 0}
            trend={`+${stats?.clientsTrend ?? 0} this month`}
            trendUp
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            sparkline={data?.sparklines.clients}
          />
          <StatCard
            title="Total Invoices"
            value={stats?.totalInvoices ?? 0}
            trend={`+${stats?.invoicesTrend ?? 0} this month`}
            trendUp
            icon={FileText}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            sparkline={data?.sparklines.invoices}
          />
          <StatCard
            title="Total Quotations"
            value={stats?.totalQuotations ?? 0}
            trend={`+${stats?.quotationsTrend ?? 0} this month`}
            trendUp
            icon={FileSpreadsheet}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            sparkline={data?.sparklines.quotations}
          />
          <StatCard
            title="Total Sales"
            value={stats?.totalSales ?? 0}
            trend={`+${stats?.salesTrend ?? 0}% this month`}
            trendUp={(stats?.salesTrend ?? 0) >= 0}
            icon={DollarSign}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            sparkline={data?.sparklines.sales}
            isCurrency
          />
          <StatCard
            title="Outstanding Credit"
            value={stats?.outstandingCredit ?? 0}
            trend={`${stats?.creditTrend ?? 0}% this month`}
            trendUp={false}
            icon={CreditCard}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            sparkline={data?.sparklines.credit}
            isCurrency
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesChart data={data?.salesOverview ?? []} />
          </div>
          <div className="space-y-4">
            <InvoiceStatusChart data={data?.invoiceStatus ?? { paid: 0, partiallyPaid: 0, pending: 0, overdue: 0 }} />
            <CreditSummaryCard
              totalCreditSales={data?.creditSummary.totalCreditSales ?? 0}
              totalReceived={data?.creditSummary.totalReceived ?? 0}
              outstandingBalance={data?.creditSummary.outstandingBalance ?? 0}
            />
          </div>
        </div>

        {/* Recent Tables */}
        <div className="grid gap-4 xl:grid-cols-2">
          <RecentInvoicesTable data={data?.recentInvoices ?? []} />
          <RecentQuotationsTable data={data?.recentQuotations ?? []} />
        </div>

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          {appBranding.copyright}
        </footer>
      </div>
  );
}
