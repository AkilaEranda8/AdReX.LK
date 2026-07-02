"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Pencil,
  FileText,
  FileSpreadsheet,
  Wallet,
  Eye,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import api from "@/lib/api";

interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  grandTotal: number;
  remainingBalance: number;
  invoiceStatus: string;
  paymentStatus: string;
}

interface ClientQuotation {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  status: string;
  grandTotal: number;
}

interface ClientPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string | null;
  note?: string | null;
  invoice?: { invoiceNumber: string } | null;
}

interface ClientDetail {
  id: string;
  clientId: string;
  name: string;
  contactNumber: string;
  email: string;
  status: string;
  creditBalance: number;
  notes?: string | null;
  createdAt: string;
  invoices: ClientInvoice[];
  quotations: ClientQuotation[];
  payments: ClientPayment[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  if (paymentStatus === "NONE") {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        —
      </span>
    );
  }
  const config: Record<string, { label: string; className: string }> = {
    PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
    PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-100 text-amber-700" },
    UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-700" },
  };
  const c = config[paymentStatus] || config.UNPAID;
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function InvoiceWorkflowBadge({ invoiceStatus }: { invoiceStatus: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
    PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700" },
    COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  };
  const c = config[invoiceStatus] || config.PENDING;
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function QuotationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
    PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700" },
    SENT: { label: "Sent", className: "bg-violet-100 text-violet-700" },
    CONVERTED: { label: "Converted", className: "bg-emerald-100 text-emerald-700" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}

function getDueDate(invoice: ClientInvoice) {
  if (invoice.dueDate) return new Date(invoice.dueDate);
  const d = new Date(invoice.invoiceDate);
  d.setDate(d.getDate() + 30);
  return d;
}

export default function ViewClientContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/clients/${id}`)
      .then((res) => setClient(res.data))
      .catch(() => router.push("/clients"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const stats = useMemo(() => {
    if (!client) return null;
    const totalBilled = client.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const outstanding = client.invoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);
    const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      totalBilled,
      outstanding,
      totalPaid,
      invoiceCount: client.invoices.length,
      quotationCount: client.quotations.length,
    };
  }, [client]);

  if (loading) return <PageLoader />;
  if (!client || !stats) return null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="mt-0.5 shrink-0 rounded-lg" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Client ID: <span className="font-semibold text-indigo-600">{client.clientId}</span>
              {" · "}
              Member since {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 rounded-lg" asChild>
            <Link href={`/invoices/new?clientId=${client.id}`}>
              <Plus className="h-4 w-4" />
              New Invoice
            </Link>
          </Button>
          <Button className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit Client
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
              <p className="text-xl font-bold">{stats.invoiceCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-50 p-2.5">
              <FileSpreadsheet className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quotations</p>
              <p className="text-xl font-bold">{stats.quotationCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Billed</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalBilled)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-50 p-2.5">
              <Wallet className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(stats.outstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              {client.contactNumber}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              {client.email}
            </p>
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-600">Credit Balance</p>
              <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(client.creditBalance)}</p>
            </div>
            {client.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">All Invoices</CardTitle>
            <span className="text-sm text-muted-foreground">{client.invoices.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody>
                  {client.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        No invoices for this client yet
                      </td>
                    </tr>
                  ) : (
                    client.invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.invoiceDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(getDueDate(invoice))}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.grandTotal)}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "font-medium",
                              invoice.remainingBalance > 0 ? "text-red-600" : "text-emerald-600"
                            )}
                          >
                            {formatCurrency(invoice.remainingBalance)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <PaymentBadge paymentStatus={invoice.paymentStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceWorkflowBadge invoiceStatus={invoice.invoiceStatus} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
                            <Link href={`/invoices/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Quotations</CardTitle>
            <span className="text-sm text-muted-foreground">{client.quotations.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Quotation #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody>
                  {client.quotations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No quotations for this client yet
                      </td>
                    </tr>
                  ) : (
                    client.quotations.map((quotation) => (
                      <tr key={quotation.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/quotations/${quotation.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {quotation.quotationNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(quotation.quotationDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(quotation.grandTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <QuotationStatusBadge status={quotation.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
                            <Link href={`/quotations/${quotation.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Payment History</CardTitle>
            <span className="text-sm text-muted-foreground">{client.payments.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {client.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        No payments recorded yet
                      </td>
                    </tr>
                  ) : (
                    client.payments.map((payment) => (
                      <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(payment.paymentDate)}</td>
                        <td className="px-4 py-3">
                          {payment.invoice?.invoiceNumber ? (
                            <span className="text-indigo-600">{payment.invoice.invoiceNumber}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{payment.paymentMethod || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
