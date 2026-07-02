"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  client: string;
  date: string;
  amount: number;
  status: string;
  payment: string;
}

interface RecentQuotation {
  id: string;
  quotationNumber: string;
  client: string;
  date: string;
  amount: number;
  status: string;
}

function StatusBadge({ status, type }: { status: string; type: "invoice" | "quotation" }) {
  const invoiceStyles: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    PENDING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAID: "bg-emerald-100 text-emerald-700",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
    UNPAID: "bg-blue-100 text-blue-700",
    Paid: "bg-emerald-100 text-emerald-700",
    Partial: "bg-amber-100 text-amber-700",
    Pending: "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
  };

  const quotationStyles: Record<string, string> = {
    Sent: "bg-blue-100 text-blue-700",
    Draft: "bg-slate-100 text-slate-600",
    Accepted: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
  };

  const label =
    status === "COMPLETED"
      ? "Completed"
      : status === "PENDING"
        ? "Pending"
        : status === "DRAFT"
          ? "Draft"
          : status === "CANCELLED"
            ? "Cancelled"
            : status === "PAID"
              ? "Paid"
              : status === "PARTIALLY_PAID"
                ? "Partially Paid"
                : status === "UNPAID"
                  ? "Pending"
                  : status;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        type === "invoice" ? invoiceStyles[status] || invoiceStyles.Pending : quotationStyles[status] || quotationStyles.Sent
      )}
    >
      {label}
    </span>
  );
}

export function RecentInvoicesTable({ data }: { data: RecentInvoice[] }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
        <Link href="/invoices" className="text-sm font-medium text-blue-600 hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-slate-50/80 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <Link href={`/invoices/${row.id}`} className="font-medium text-blue-600 hover:underline">
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{row.client}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(row.date)}</td>
                    <td className="px-5 py-3.5 font-medium">{formatCurrency(row.amount)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} type="invoice" />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.payment} type="invoice" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentQuotationsTable({ data }: { data: RecentQuotation[] }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Recent Quotations</CardTitle>
        <Link href="/quotations" className="text-sm font-medium text-blue-600 hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-slate-50/80 text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Quotation #</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No quotations yet
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <Link href={`/quotations/${row.id}`} className="font-medium text-blue-600 hover:underline">
                        {row.quotationNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{row.client}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(row.date)}</td>
                    <td className="px-5 py-3.5 font-medium">{formatCurrency(row.amount)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.status} type="quotation" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
