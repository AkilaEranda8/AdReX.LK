"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";
import { InvoiceStatCards } from "@/components/invoices/invoice-stat-cards";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { InvoiceTable, type InvoiceRow } from "@/components/invoices/invoice-table";
import { downloadPDF } from "@/lib/pdf";
import { buildInvoicePdfData } from "@/lib/invoice-pdf";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get("/invoices");
      setInvoices(res.data);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q);
      const matchStatus = status === "all" || inv.invoiceStatus === status;
      const matchPayment =
        paymentStatus === "all" || inv.paymentStatus === paymentStatus;
      return matchSearch && matchStatus && matchPayment;
    });
  }, [invoices, search, status, paymentStatus]);

  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const outstanding = invoices.reduce((s, i) => s + i.remainingBalance, 0);
    const paidAmount = totalAmount - outstanding;
    return {
      totalInvoices: invoices.length,
      totalAmount,
      paidAmount,
      outstanding,
    };
  }, [invoices]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((i) => ({
        "Invoice #": i.invoiceNumber,
        Client: i.client.name,
        Date: i.invoiceDate,
        Amount: i.grandTotal,
        "Invoice Status": i.invoiceStatus,
        "Payment Status": i.paymentStatus,
        Balance: i.remainingBalance,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices.xlsx");
  };

  const handleDownload = async (row: InvoiceRow) => {
    try {
      const res = await api.get(`/invoices/${row.id}`);
      const pdfData = await buildInvoicePdfData(res.data);
      downloadPDF(pdfData);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleStatusChange = async (row: InvoiceRow, newStatus: string) => {
    if (newStatus === row.invoiceStatus) return;
    setUpdatingStatusId(row.id);
    try {
      await api.patch(`/invoices/${row.id}/status`, { invoiceStatus: newStatus });
      toast.success("Invoice status updated");
      fetchInvoices();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/invoices/${deleteId}`);
      toast.success("Invoice deleted");
      setDeleteOpen(false);
      fetchInvoices();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and track all your invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/invoices/new">
            <Button className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      <InvoiceStatCards {...stats} />

      <InvoiceFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={(v) => { setPaymentStatus(v); setPage(1); }}
        onClear={clearFilters}
      />

      <InvoiceTable
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
        onDelete={(row) => {
          setDeleteId(row.id);
          setDeleteOpen(true);
        }}
        onStatusChange={handleStatusChange}
        updatingStatusId={updatingStatusId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice?"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
