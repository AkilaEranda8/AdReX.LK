"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface PaymentRow {
  id: string;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string;
  note: string | null;
  client: { id: string; clientId: string; name: string };
  invoice: { id: string; invoiceNumber: string } | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/payments");
      setPayments(res.data.payments || []);
      setTotalCollected(res.data.summary?.totalCollected || 0);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        !q ||
        p.client.name.toLowerCase().includes(q) ||
        p.client.clientId.toLowerCase().includes(q) ||
        (p.invoice?.invoiceNumber || "").toLowerCase().includes(q) ||
        (p.paymentMethod || "").toLowerCase().includes(q) ||
        (p.note || "").toLowerCase().includes(q)
    );
  }, [payments, search]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((p) => ({
        Date: p.paymentDate,
        Client: p.client.name,
        "Client ID": p.client.clientId,
        Invoice: p.invoice?.invoiceNumber || "",
        Method: p.paymentMethod || "Cash",
        Amount: p.amount,
        Note: p.note || "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "payments.xlsx");
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cash receipts register — advances and customer payments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/credits">
            <Button variant="outline" className="rounded-lg">
              Receivables
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 rounded-lg" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              Payments listed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total collected (loaded)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Input
          className="max-w-md rounded-lg"
          placeholder="Search client, invoice, method..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/credits/${p.client.id}`} className="font-medium text-indigo-600 hover:underline">
                          {p.client.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.client.clientId}</p>
                      </td>
                      <td className="px-4 py-3">
                        {p.invoice ? (
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {p.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {p.note ? (
                          <p className="text-xs text-muted-foreground">{p.note}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{p.paymentMethod || "Cash"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
