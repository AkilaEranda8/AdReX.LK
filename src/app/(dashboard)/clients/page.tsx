"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";
import { ClientStatCards } from "@/components/clients/client-stat-cards";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientTable, type ClientRow } from "@/components/clients/client-table";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.clientId.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.contactNumber.includes(q);
      const matchStatus = status === "all" || c.status === status;
      return matchSearch && matchStatus;
    });
  }, [clients, search, status]);

  const stats = useMemo(() => ({
    totalClients: clients.length,
    activeClients: clients.filter((c) => c.status === "ACTIVE").length,
    inactiveClients: clients.filter((c) => c.status === "INACTIVE").length,
    totalCredit: clients.reduce((s, c) => s + c.creditBalance, 0),
  }), [clients]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((c) => ({
        "Client ID": c.clientId,
        Name: c.name,
        Contact: c.contactNumber,
        Email: c.email,
        Status: c.status,
        "Credit Balance": c.creditBalance,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "clients.xlsx");
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${selectedClient.id}`);
      toast.success("Client deleted");
      setDeleteOpen(false);
      fetchClients();
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
    setPage(1);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your client database and contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-lg border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button asChild className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>

      <ClientStatCards {...stats} />

      <ClientFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        onClear={clearFilters}
      />

      <ClientTable
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
        onEdit={(row) => router.push(`/clients/${row.id}/edit`)}
        onDelete={(row) => { setSelectedClient(row); setDeleteOpen(true); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
