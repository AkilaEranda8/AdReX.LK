"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, FileText, FileSpreadsheet, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageLoader } from "@/components/ui/loading";
import { formatCurrency, cn } from "@/lib/utils";
import api from "@/lib/api";

interface ClientDetail {
  clientId: string;
  name: string;
  contactNumber: string;
  email: string;
  status: string;
  creditBalance: number;
  invoices?: unknown[];
  quotations?: unknown[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

export function ClientViewDialog({ open, onOpenChange, clientId }: Props) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      setLoading(true);
      api
        .get(`/clients/${clientId}`)
        .then((res) => setClient(res.data))
        .finally(() => setLoading(false));
    }
  }, [open, clientId]);

  if (!open) return null;

  const isActive = client?.status === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Client Details</DialogTitle>
        </DialogHeader>
        {loading ? (
          <PageLoader />
        ) : client ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client ID</p>
                <p className="mt-1 text-lg font-bold text-indigo-600">{client.clientId}</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{client.name}</p>
              </div>
              <span
                className={cn(
                  "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {client.contactNumber}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                {client.email}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <FileText className="mx-auto h-5 w-5 text-blue-600" />
                <p className="mt-2 text-lg font-bold">{client.invoices?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Invoices</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <FileSpreadsheet className="mx-auto h-5 w-5 text-violet-600" />
                <p className="mt-2 text-lg font-bold">{client.quotations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Quotations</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-center">
                <Wallet className="mx-auto h-5 w-5 text-red-500" />
                <p className="mt-2 text-sm font-bold text-red-600">{formatCurrency(client.creditBalance)}</p>
                <p className="text-xs text-muted-foreground">Credit</p>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
