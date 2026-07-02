"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Mail,
  Phone,
  FileText,
  Receipt,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface CreditDetail {
  id: string;
  clientId: string;
  name: string;
  email: string;
  contactNumber: string;
  creditBalance: number;
  invoices: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    grandTotal: number;
    remainingBalance: number;
    status: string;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
    note?: string;
    invoiceId?: string;
  }[];
}

export default function ViewCreditContent() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<CreditDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/clients/${id}`)
      .then((res) => setClient(res.data))
      .catch(() => toast.error("Failed to load client credit"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!client) return null;

  const unpaidInvoices = client.invoices.filter((i) => i.remainingBalance > 0);
  const totalInvoiced = client.invoices.reduce((s, i) => s + i.grandTotal, 0);
  const outstanding = client.creditBalance;
  const paidAmount = Math.max(0, totalInvoiced - outstanding);
  const paidPct = totalInvoiced > 0 ? Math.round((paidAmount / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/credits">
            <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <span className="inline-flex rounded-md bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                Credit Client
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {client.clientId} · Outstanding: {formatCurrency(outstanding)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/credits/${id}/payment`}>
            <Button className="gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700">
              <DollarSign className="h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Credit", value: formatCurrency(totalInvoiced), color: "text-slate-900" },
          { label: "Paid Amount", value: formatCurrency(paidAmount), color: "text-emerald-600" },
          { label: "Outstanding", value: formatCurrency(outstanding), color: "text-red-500" },
          { label: "Payment Progress", value: `${paidPct}%`, color: "text-indigo-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className={cn("mt-1 text-xl font-bold", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            paidPct >= 100 ? "bg-emerald-500" : paidPct >= 50 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${paidPct}%` }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Unpaid Invoices ({unpaidInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No unpaid invoices</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4">Invoice #</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4 text-right">Total</th>
                        <th className="pb-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50/50">
                          <td className="py-3 pr-4">
                            <Link href={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:underline">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                          <td className="py-3 pr-4 text-right">{formatCurrency(inv.grandTotal)}</td>
                          <td className="py-3 text-right font-semibold text-red-500">
                            {formatCurrency(inv.remainingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-emerald-600" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {client.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(p.paymentDate)}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium text-slate-900">{client.name}</p>
              <p className="text-muted-foreground">{client.clientId}</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {client.email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {client.contactNumber}
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/10 shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Outstanding Balance</p>
              <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(outstanding)}</p>
              <Link href={`/credits/${id}/payment`} className="mt-4 block">
                <Button className="w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  <DollarSign className="h-4 w-4" />
                  Record Payment
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
