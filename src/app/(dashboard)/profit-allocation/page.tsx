"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PiggyBank,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  ArrowRightLeft,
  Settings2,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { ProfitAllocationSettings } from "@/lib/settings";

type PeriodType = "day" | "week" | "month" | "year";
type TabKey = "allocations" | "growth" | "savings" | "history";

interface Summary {
  period: PeriodType;
  totalIncome: number;
  operationalExpenses: number;
  growthExpenses: number;
  profit: number;
  allocatedOperating: number;
  allocatedSavings: number;
  savingsBalance: number;
  lowSavings: boolean;
  settings: ProfitAllocationSettings;
  suggested: {
    operatingAmount: number;
    savingsAmount: number;
    operatingPercent: number;
    savingsPercent: number;
  };
}

interface AllocationRow {
  id: string;
  allocationNumber: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  operationalExpenses: number;
  profit: number;
  operatingAmount: number;
  savingsAmount: number;
  operatingBank: string | null;
  savingsBank: string | null;
  createdAt: string;
}

interface ExpenseRow {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  status: string;
}

interface SavingsRow {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface HistoryRow {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  totalIncome: number;
  operationalExpenses: number;
  profit: number;
  allocated: boolean;
  createdAt: string;
}

export default function ProfitAllocationPage() {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [tab, setTab] = useState<TabKey>("allocations");
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [growthExpenses, setGrowthExpenses] = useState<ExpenseRow[]>([]);
  const [savingsTx, setSavingsTx] = useState<SavingsRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [settingsForm, setSettingsForm] = useState<ProfitAllocationSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sumRes, allocRes, growthRes, savRes, histRes] = await Promise.all([
        api.get(`/profit-allocation?period=${period}`),
        api.get("/profit-allocation?view=allocations"),
        api.get("/expenses?kind=GROWTH"),
        api.get("/profit-allocation?view=savings"),
        api.get("/profit-allocation?view=history"),
      ]);
      setSummary(sumRes.data);
      setAllocations(allocRes.data);
      setGrowthExpenses(growthRes.data);
      setSavingsTx(savRes.data.transactions || []);
      setHistory(histRes.data);
      if (sumRes.data.lowSavings) {
        toast.error("Company savings balance is low");
      }
    } catch {
      toast.error("Failed to load profit allocation data");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleAllocate = async () => {
    if (!summary || summary.profit <= 0) {
      toast.error("No profit available to allocate");
      return;
    }
    setAllocating(true);
    try {
      const res = await api.post("/profit-allocation", { periodType: period });
      toast.success(
        `Allocated — Operating ${formatCurrency(res.data.allocation.operatingAmount)}, Savings ${formatCurrency(res.data.allocation.savingsAmount)}`
      );
      await load();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Allocation failed");
    } finally {
      setAllocating(false);
    }
  };

  const openSettings = async () => {
    try {
      const res = await api.get("/profit-allocation/settings");
      setSettingsForm(res.data);
      setSettingsOpen(true);
    } catch {
      toast.error("Failed to load settings");
    }
  };

  const saveSettings = async () => {
    if (!settingsForm) return;
    if (Math.round(settingsForm.operatingPercent + settingsForm.savingsPercent) !== 100) {
      toast.error("Percentages must total 100%");
      return;
    }
    setSavingSettings(true);
    try {
      await api.put("/profit-allocation/settings", settingsForm);
      toast.success("Profit allocation settings saved");
      setSettingsOpen(false);
      await load();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || !summary) return <PageLoader />;

  const cards = [
    { label: "Total Income", value: summary.totalIncome, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Operational Expenses", value: summary.operationalExpenses, icon: Wallet, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Profit", value: summary.profit, icon: CircleDollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "→ Operating Bank", value: summary.allocatedOperating, icon: Landmark, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "→ Savings Bank", value: summary.allocatedSavings, icon: PiggyBank, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Savings Balance", value: summary.savingsBalance, icon: PiggyBank, color: summary.lowSavings ? "text-red-600" : "text-teal-600", bg: summary.lowSavings ? "bg-red-50" : "bg-teal-50" },
  ];

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "allocations", label: "Allocation History", count: allocations.length },
    { key: "growth", label: "Growth Expenses", count: growthExpenses.length },
    { key: "savings", label: "Savings Transactions", count: savingsTx.length },
    { key: "history", label: "Calculation History", count: history.length },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit Allocation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profit = Income − Operational expenses. Growth spending comes from company savings only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="h-10 w-[140px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 rounded-lg" onClick={openSettings}>
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <Button
            className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleAllocate}
            disabled={allocating || summary.profit <= 0 || !summary.settings.enabled}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {allocating ? "Allocating..." : "Allocate Profit"}
          </Button>
        </div>
      </div>

      {summary.lowSavings && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Savings balance is below the warning threshold ({formatCurrency(summary.settings.lowSavingsWarning)}).
            Growth expenses may fail until more profit is allocated to savings.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-slate-200/80 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", card.bg)}>
                  <Icon className={cn("h-6 w-6", card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="truncate text-xl font-bold text-slate-900">{formatCurrency(card.value)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Suggested Split</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Operating ({summary.suggested.operatingPercent}%) → {summary.settings.operatingBank}
              </span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(summary.suggested.operatingAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Savings ({summary.suggested.savingsPercent}%) → {summary.settings.savingsBank}
              </span>
              <span className="font-semibold text-violet-600">
                {formatCurrency(summary.suggested.savingsAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-medium">Growth spent (period)</span>
              <span className="font-semibold text-red-500">{formatCurrency(summary.growthExpenses)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Income (sales invoices) − Operational expenses = <strong className="text-foreground">Profit</strong></p>
            <p>2. Allocate profit → {summary.settings.operatingPercent}% Operating bank, {summary.settings.savingsPercent}% Savings bank</p>
            <p>3. Growth expenses (marketing, R&amp;D, expansion) pay from <strong className="text-foreground">Savings only</strong> — they do not reduce profit</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-card p-1.5 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-80">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "allocations" && (
        <DataTable
          empty="No allocations yet"
          headers={["Number", "Period", "Profit", "Operating", "Savings", "Date"]}
          rows={allocations.map((a) => [
            a.allocationNumber,
            `${a.periodType} · ${formatDate(a.periodStart)}`,
            formatCurrency(a.profit),
            formatCurrency(a.operatingAmount),
            formatCurrency(a.savingsAmount),
            formatDate(a.createdAt),
          ])}
        />
      )}

      {tab === "growth" && (
        <DataTable
          empty="No growth expenses"
          headers={["Expense #", "Date", "Category", "Description", "Amount", "Status"]}
          rows={growthExpenses.map((e) => [
            e.expenseNumber,
            formatDate(e.expenseDate),
            e.category,
            e.description,
            formatCurrency(e.amount),
            e.status,
          ])}
        />
      )}

      {tab === "savings" && (
        <DataTable
          empty="No savings transactions"
          headers={["Date", "Type", "Amount", "Balance After", "Reference", "Notes"]}
          rows={savingsTx.map((t) => [
            formatDate(t.createdAt),
            t.type,
            formatCurrency(t.amount),
            formatCurrency(t.balanceAfter),
            t.reference || "—",
            t.notes || "—",
          ])}
        />
      )}

      {tab === "history" && (
        <DataTable
          empty="No calculation history"
          headers={["Period", "Income", "Op. Expenses", "Profit", "Allocated", "Date"]}
          rows={history.map((h) => [
            `${h.periodType} · ${formatDate(h.periodStart)}`,
            formatCurrency(h.totalIncome),
            formatCurrency(h.operationalExpenses),
            formatCurrency(h.profit),
            h.allocated ? "Yes" : "No",
            formatDate(h.createdAt),
          ])}
        />
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Profit Allocation Settings</DialogTitle>
          </DialogHeader>
          {settingsForm && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                />
                Profit allocation enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settingsForm.autoAllocate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoAllocate: e.target.checked })}
                />
                Auto-allocate when period closing runs (manual allocate still available)
              </label>
              <div className="space-y-2">
                <Label>Operating Bank</Label>
                <Input
                  value={settingsForm.operatingBank}
                  onChange={(e) => setSettingsForm({ ...settingsForm, operatingBank: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Savings Bank</Label>
                <Input
                  value={settingsForm.savingsBank}
                  onChange={(e) => setSettingsForm({ ...settingsForm, savingsBank: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Operating %</Label>
                  <Input
                    type="number"
                    value={settingsForm.operatingPercent}
                    onChange={(e) => {
                      const operatingPercent = Number(e.target.value) || 0;
                      setSettingsForm({
                        ...settingsForm,
                        operatingPercent,
                        savingsPercent: Math.max(0, 100 - operatingPercent),
                      });
                    }}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Savings %</Label>
                  <Input
                    type="number"
                    value={settingsForm.savingsPercent}
                    onChange={(e) => {
                      const savingsPercent = Number(e.target.value) || 0;
                      setSettingsForm({
                        ...settingsForm,
                        savingsPercent,
                        operatingPercent: Math.max(0, 100 - savingsPercent),
                      });
                    }}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Low savings warning (Rs.)</Label>
                <Input
                  type="number"
                  value={settingsForm.lowSavingsWarning}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, lowSavingsWarning: Number(e.target.value) || 0 })
                  }
                  className="rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" className="rounded-lg" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={saveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              {headers.map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
