"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";
import { RecurringStatCards } from "@/components/recurring/recurring-stat-cards";
import { RecurringFilters } from "@/components/recurring/recurring-filters";
import { RecurringTable, type RecurringRow } from "@/components/recurring/recurring-table";
import {
  calcRecurringTotal,
  isDueSoon,
  parseRecurringItems,
  FREQUENCY_LABELS,
} from "@/lib/recurring";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { formatDate } from "@/lib/utils";

interface RecurringApiItem {
  id: string;
  frequency: string;
  nextDate: string;
  active: boolean;
  discount: number;
  itemsJson: string;
  client: { name: string; clientId: string; contactNumber?: string };
}

function toRow(item: RecurringApiItem): RecurringRow {
  const lineItems = parseRecurringItems(item.itemsJson);
  return {
    ...item,
    itemCount: lineItems.length,
    total: calcRecurringTotal(lineItems, item.discount),
  };
}

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RecurringRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get("/recurring");
      setItems(res.data.map(toRow));
    } catch {
      toast.error("Failed to load recurring invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.client.name.toLowerCase().includes(q) ||
        item.client.clientId.toLowerCase().includes(q);
      const matchFrequency = frequency === "all" || item.frequency === frequency;
      const matchStatus =
        status === "all" ||
        (status === "active" && item.active) ||
        (status === "paused" && !item.active);
      return matchSearch && matchFrequency && matchStatus;
    });
  }, [items, search, frequency, status]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.active);
    const monthlyValue = active.reduce((sum, item) => {
      if (item.frequency === "weekly") return sum + item.total * 4;
      if (item.frequency === "yearly") return sum + item.total / 12;
      return sum + item.total;
    }, 0);
    return {
      totalSchedules: items.length,
      activeSchedules: active.length,
      dueThisWeek: active.filter((i) => isDueSoon(i.nextDate)).length,
      monthlyValue: Math.round(monthlyValue * 100) / 100,
    };
  }, [items]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((i) => ({
        Client: i.client.name,
        "Client ID": i.client.clientId,
        Frequency: FREQUENCY_LABELS[i.frequency] || i.frequency,
        "Next Date": formatDate(i.nextDate),
        Items: i.itemCount,
        Amount: i.total,
        Status: i.active ? "Active" : "Paused",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recurring");
    XLSX.writeFile(wb, "recurring-invoices.xlsx");
  };

  const handleGenerate = async (row: RecurringRow) => {
    setGeneratingId(row.id);
    try {
      const res = await api.post(`/recurring/${row.id}`);
      toast.success(`Invoice ${res.data.invoiceNumber} created`);
      fetchItems();
    } catch {
      toast.error("Failed to generate invoice");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleToggleActive = async (row: RecurringRow) => {
    setTogglingId(row.id);
    try {
      await api.patch(`/recurring/${row.id}`, { active: !row.active });
      toast.success(row.active ? "Schedule paused" : "Schedule resumed");
      fetchItems();
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    setDeleting(true);
    try {
      await api.delete(`/recurring/${selectedRow.id}`);
      toast.success("Recurring schedule deleted");
      setDeleteOpen(false);
      fetchItems();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFrequency("all");
    setStatus("all");
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatically generate invoices on a weekly, monthly, or yearly schedule
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/recurring/new">
            <Button className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              Add Recurring
            </Button>
          </Link>
        </div>
      </div>

      <RecurringStatCards {...stats} />

      <RecurringFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        frequency={frequency}
        onFrequencyChange={(v) => { setFrequency(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        onClear={clearFilters}
      />

      <RecurringTable
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
        onGenerate={handleGenerate}
        onToggleActive={handleToggleActive}
        onDelete={(row) => {
          setSelectedRow(row);
          setDeleteOpen(true);
        }}
        generatingId={generatingId}
        togglingId={togglingId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Recurring Schedule"
        description={
          selectedRow
            ? `Delete recurring schedule for ${selectedRow.client.name}? This cannot be undone.`
            : "Are you sure you want to delete this schedule?"
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
