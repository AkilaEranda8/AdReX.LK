"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";
import { QuotationStatCards } from "@/components/quotations/quotation-stat-cards";
import { QuotationFilters } from "@/components/quotations/quotation-filters";
import { QuotationTable, type QuotationRow } from "@/components/quotations/quotation-table";
import { downloadPDF } from "@/lib/pdf";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

function isInPeriod(dateStr: string, period: string) {
  if (period === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (period === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
  }
  if (period === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await api.get("/quotations");
      setQuotations(res.data);
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        q.quotationNumber.toLowerCase().includes(term) ||
        q.client.name.toLowerCase().includes(term) ||
        (q.client.clientId || "").toLowerCase().includes(term);
      const matchPeriod = isInPeriod(q.quotationDate, period);
      return matchSearch && matchPeriod;
    });
  }, [quotations, search, period]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = quotations.filter((q) => {
      const d = new Date(q.quotationDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const totalValue = quotations.reduce((s, q) => s + q.grandTotal, 0);
    return {
      totalQuotations: quotations.length,
      totalValue,
      thisMonth,
      averageValue: quotations.length ? totalValue / quotations.length : 0,
    };
  }, [quotations]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((q) => ({
        "Quotation #": q.quotationNumber,
        Client: q.client.name,
        Date: q.quotationDate,
        Amount: q.grandTotal,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    XLSX.writeFile(wb, "quotations.xlsx");
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;
    setDeleting(true);
    try {
      await api.delete(`/quotations/${selectedQuotation.id}`);
      toast.success("Quotation deleted");
      setDeleteOpen(false);
      fetchQuotations();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async (row: QuotationRow) => {
    setConvertingId(row.id);
    try {
      const res = await api.post(`/quotations/${row.id}/convert`);
      toast.success("Converted to invoice");
      router.push(`/invoices/${res.data.id}`);
    } catch {
      toast.error("Failed to convert");
    } finally {
      setConvertingId(null);
    }
  };

  const handleDownload = async (row: QuotationRow) => {
    try {
      const res = await api.get(`/quotations/${row.id}`);
      const data = res.data;
      downloadPDF({
        type: "quotation",
        number: data.quotationNumber,
        date: data.quotationDate,
        client: data.client,
        items: data.items,
        grandTotal: data.grandTotal,
      });
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPeriod("all");
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage client quotations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button asChild className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Link href="/quotations/new">
              <Plus className="h-4 w-4" />
              Create Quotation
            </Link>
          </Button>
        </div>
      </div>

      <QuotationStatCards {...stats} />

      <QuotationFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        period={period}
        onPeriodChange={(v) => { setPeriod(v); setPage(1); }}
        onClear={clearFilters}
      />

      <QuotationTable
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
        onDownload={handleDownload}
        onConvert={handleConvert}
        onDelete={(row) => { setSelectedQuotation(row); setDeleteOpen(true); }}
        convertingId={convertingId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Quotation"
        description={`Delete quotation ${selectedQuotation?.quotationNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
