"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  INVOICE_WORKFLOW_OPTIONS,
} from "@/lib/invoice-status";

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  grandTotal: number;
  remainingBalance: number;
  invoiceStatus: string;
  paymentStatus: string;
  client: { name: string; contactNumber?: string };
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

function getDueDate(row: InvoiceRow) {
  if (row.dueDate) return new Date(row.dueDate);
  const d = new Date(row.invoiceDate);
  d.setDate(d.getDate() + 30);
  return d;
}

interface InvoiceTableProps {
  data: InvoiceRow[];
  selected: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDownload: (row: InvoiceRow) => void;
  onDelete?: (row: InvoiceRow) => void;
  onStatusChange?: (row: InvoiceRow, invoiceStatus: string) => void;
  updatingStatusId?: string | null;
}

export function InvoiceTable({
  data,
  selected,
  onSelectAll,
  onSelect,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onDownload,
  onDelete,
  onStatusChange,
  updatingStatusId,
}: InvoiceTableProps) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
              </th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Invoice Date</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Total Amount</th>
              <th className="px-4 py-3">Payment Status</th>
              <th className="px-4 py-3">Invoice Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No invoices found
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selected.includes(row.id);
                return (
                <tr
                  key={row.id}
                  data-selected={isSelected ? "true" : undefined}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50"
                  )}
                >
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={(c) => onSelect(row.id, !!c)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/invoices/${row.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{row.client.name}</p>
                    {row.client.contactNumber && (
                      <p className="text-xs text-muted-foreground">{row.client.contactNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(row.invoiceDate)}</td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(getDueDate(row))}</td>
                  <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.grandTotal)}</td>
                  <td className="px-4 py-4">
                    <PaymentBadge paymentStatus={row.paymentStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <InvoiceWorkflowBadge invoiceStatus={row.invoiceStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/invoices/${row.id}`}>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        title="Download PDF"
                        aria-label="Download PDF"
                        onClick={() => onDownload(row)}
                        disabled={row.invoiceStatus === "DRAFT"}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {menuId === row.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-9 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <Link
                                href={`/invoices/${row.id}/edit`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setMenuId(null)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>
                              {onDelete && (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    onDelete(row);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                              {onStatusChange && (
                                <div className="border-t px-3 py-2">
                                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Invoice Status</p>
                                  <select
                                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                                    value={row.invoiceStatus}
                                    disabled={updatingStatusId === row.id}
                                    onChange={(e) => {
                                      setMenuId(null);
                                      onStatusChange(row, e.target.value);
                                    }}
                                  >
                                    {INVOICE_WORKFLOW_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total} invoices
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(1)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className={cn("h-8 w-8", page === p && "bg-indigo-600 text-white hover:bg-indigo-700")}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
