"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loading";
import { CreditStatCards } from "@/components/credits/credit-stat-cards";
import { CreditFilters } from "@/components/credits/credit-filters";
import { CreditTable, type CreditRow } from "@/components/credits/credit-table";
import { PaymentDialog } from "@/components/credits/payment-dialog";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

function sortCredits(data: CreditRow[], sortBy: string) {
  const sorted = [...data];
  switch (sortBy) {
    case "outstanding_asc":
      return sorted.sort((a, b) => a.outstandingBalance - b.outstandingBalance);
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "outstanding_desc":
    default:
      return sorted.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("outstanding_desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CreditRow | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await api.get("/credits");
      setCredits(res.data);
    } catch {
      toast.error("Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const matched = credits.filter(
      (c) =>
        !term ||
        c.clientId.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term)
    );
    return sortCredits(matched, sortBy);
  }, [credits, search, sortBy]);

  const stats = useMemo(() => ({
    totalClients: credits.length,
    totalCreditSales: credits.reduce((s, c) => s + c.totalCredit, 0),
    totalReceived: credits.reduce((s, c) => s + c.paidAmount, 0),
    outstandingBalance: credits.reduce((s, c) => s + c.outstandingBalance, 0),
  }), [credits]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((c) => ({
        "Client ID": c.clientId,
        Name: c.name,
        "Total Credit": c.totalCredit,
        "Paid Amount": c.paidAmount,
        Outstanding: c.outstandingBalance,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Credit");
    XLSX.writeFile(wb, "customer-credits.xlsx");
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("outstanding_desc");
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Credit</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track credit sales and record client payments</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <CreditStatCards {...stats} />

      <CreditFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); setPage(1); }}
        onClear={clearFilters}
      />

      <CreditTable
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
        onRecordPayment={(row) => { setSelectedClient(row); setPaymentOpen(true); }}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        client={selectedClient}
        onSuccess={fetchCredits}
      />
    </div>
  );
}
