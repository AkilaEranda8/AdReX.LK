"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { ReportStatCards } from "@/components/reports/report-stat-cards";
import { ReportFilters } from "@/components/reports/report-filters";
import {
  OverdueInvoicesTable,
  ClientStatementsTable,
  RecentPaymentsTable,
  RecentExpensesTable,
  type OverdueRow,
  type ClientStatementRow,
  type PaymentRow,
  type ExpenseReportRow,
} from "@/components/reports/report-tables";
import { ReportChartsSection, type ReportChartsData } from "@/components/reports/report-charts";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

type ReportTab = "overdue" | "statements" | "payments" | "expenses";

interface ReportData {
  summary: {
    monthlySales: number;
    totalOutstanding: number;
    totalCollected: number;
    totalExpenses: number;
    netProfit: number;
    overdueCount: number;
    overdueAmount: number;
  };
  charts: ReportChartsData;
  overdueInvoices: OverdueRow[];
  clientStatements: ClientStatementRow[];
  recentPayments: PaymentRow[];
  recentExpenses: ExpenseReportRow[];
}

const tabs: { key: ReportTab; label: string }[] = [
  { key: "overdue", label: "Overdue Invoices" },
  { key: "statements", label: "Client Outstanding" },
  { key: "payments", label: "Recent Payments" },
  { key: "expenses", label: "Recent Expenses" },
];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState<ReportTab>("overdue");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchReports = useCallback(async () => {
    try {
      const res = await api.get(`/reports?period=${period}`);
      setData(res.data);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [fetchReports]);

  const filterText = (text: string) => {
    const q = search.toLowerCase();
    return !q || text.toLowerCase().includes(q);
  };

  const filteredOverdue = useMemo(() => {
    if (!data) return [];
    return data.overdueInvoices.filter(
      (i) => filterText(i.invoiceNumber) || filterText(i.client)
    );
  }, [data, search]);

  const filteredStatements = useMemo(() => {
    if (!data) return [];
    return data.clientStatements.filter(
      (c) => filterText(c.name) || filterText(c.clientId)
    );
  }, [data, search]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    return data.recentPayments.filter(
      (p) =>
        filterText(p.client.name) ||
        filterText(p.invoice?.invoiceNumber || "") ||
        filterText(p.paymentMethod || "")
    );
  }, [data, search]);

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    return data.recentExpenses.filter(
      (e) =>
        filterText(e.expenseNumber) ||
        filterText(e.description) ||
        filterText(e.category) ||
        filterText(e.vendor || "")
    );
  }, [data, search]);

  const handleExport = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const overdueSheet = XLSX.utils.json_to_sheet(
      filteredOverdue.map((i) => ({
        Invoice: i.invoiceNumber,
        Client: i.client,
        "Due Date": i.dueDate,
        Balance: i.remainingBalance,
      }))
    );
    XLSX.utils.book_append_sheet(wb, overdueSheet, "Overdue");

    const stmtSheet = XLSX.utils.json_to_sheet(
      filteredStatements.map((c) => ({
        "Client ID": c.clientId,
        Name: c.name,
        Outstanding: c.creditBalance,
      }))
    );
    XLSX.utils.book_append_sheet(wb, stmtSheet, "Outstanding");

    const paySheet = XLSX.utils.json_to_sheet(
      filteredPayments.map((p) => ({
        Date: p.paymentDate,
        Client: p.client.name,
        Invoice: p.invoice?.invoiceNumber || "",
        Method: p.paymentMethod || "cash",
        Amount: p.amount,
      }))
    );
    XLSX.utils.book_append_sheet(wb, paySheet, "Payments");

    const expSheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map((e) => ({
        "Expense #": e.expenseNumber,
        Date: e.expenseDate,
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Status: e.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, expSheet, "Expenses");

    XLSX.writeFile(wb, `reports-${period}.xlsx`);
  };

  const clearFilters = () => {
    setSearch("");
    setPeriod("month");
    setPage(1);
  };

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sales performance, outstanding balances, and payment analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-lg border-slate-200"
            onClick={() => window.open("/api/backup", "_blank")}
          >
            <Database className="h-4 w-4" />
            Backup Database
          </Button>
        </div>
      </div>

      <ReportStatCards {...data.summary} />

      <ReportChartsSection charts={data.charts} />

      <ReportFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        period={period}
        onPeriodChange={(v) => { setPeriod(v); setPage(1); }}
        onClear={clearFilters}
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-card p-1.5 shadow-sm dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-80">
              (
              {tab.key === "overdue"
                ? filteredOverdue.length
                : tab.key === "statements"
                  ? filteredStatements.length
                  : tab.key === "payments"
                    ? filteredPayments.length
                    : filteredExpenses.length}
              )
            </span>
          </button>
        ))}
      </div>

      {activeTab === "overdue" && (
        <OverdueInvoicesTable
          data={filteredOverdue}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {activeTab === "statements" && (
        <ClientStatementsTable
          data={filteredStatements}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {activeTab === "payments" && (
        <RecentPaymentsTable
          data={filteredPayments}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {activeTab === "expenses" && (
        <RecentExpensesTable
          data={filteredExpenses}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </div>
  );
}
