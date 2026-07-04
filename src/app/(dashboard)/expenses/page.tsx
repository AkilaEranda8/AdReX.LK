"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";
import { ExpenseStatCards } from "@/components/expenses/expense-stat-cards";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseTable, type ExpenseRow } from "@/components/expenses/expense-table";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get("/expenses");
      setExpenses(res.data);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter((e) => {
      const matchSearch =
        !q ||
        e.expenseNumber.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.vendor || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchCategory = category === "all" || e.category === category;
      const matchStatus = status === "all" || e.status === status;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [expenses, search, category, status]);

  const now = new Date();
  const stats = useMemo(() => {
    const active = expenses.filter((e) => e.status !== "CANCELLED");
    const pending = expenses.filter((e) => e.status === "PENDING");
    return {
      totalExpenses: active.reduce((s, e) => s + e.amount, 0),
      thisMonth: active
        .filter((e) => {
          const d = new Date(e.expenseDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, e) => s + e.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, e) => s + e.amount, 0),
    };
  }, [expenses, now]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((e) => ({
        "Expense #": e.expenseNumber,
        Date: e.expenseDate,
        Category: e.category,
        Vendor: e.vendor || "",
        Description: e.description,
        Amount: e.amount,
        Status: e.status,
        "Payment Method": e.paymentMethod || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "expenses.xlsx");
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${selectedExpense.id}`);
      toast.success("Expense deleted");
      setDeleteOpen(false);
      fetchExpenses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track business expenses and outgoing payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button asChild className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Link href="/expenses/new" prefetch={false}>
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      <ExpenseStatCards {...stats} />

      <ExpenseFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        category={category}
        onCategoryChange={(v) => { setCategory(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        onClear={clearFilters}
      />

      <ExpenseTable
        data={filtered}
        selected={selected}
        onSelectAll={(checked) =>
          setSelected(checked ? filtered.slice((page - 1) * pageSize, page * pageSize).map((r) => r.id) : [])
        }
        onSelect={(id, checked) =>
          setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
        }
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onEdit={(row) => router.push(`/expenses/${row.id}/edit`)}
        onDelete={(row) => { setSelectedExpense(row); setDeleteOpen(true); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Expense"
        description={`Are you sure you want to delete "${selectedExpense?.expenseNumber}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
