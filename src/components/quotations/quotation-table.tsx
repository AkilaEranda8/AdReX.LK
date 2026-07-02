"use client";

import Link from "next/link";
import {
  Eye,
  Pencil,
  Download,
  FileInput,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { getValidUntilFromDate } from "@/lib/quotation-form";

export interface QuotationRow {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  grandTotal: number;
  client: { name: string; contactNumber?: string; clientId?: string };
}

function StatusBadge() {
  return (
    <span className="inline-flex rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
      Pending
    </span>
  );
}

interface QuotationTableProps {
  data: QuotationRow[];
  selected: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDownload: (row: QuotationRow) => void;
  onConvert: (row: QuotationRow) => void;
  onDelete: (row: QuotationRow) => void;
  convertingId: string | null;
}

export function QuotationTable({
  data,
  selected,
  onSelectAll,
  onSelect,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onDownload,
  onConvert,
  onDelete,
  convertingId,
}: QuotationTableProps) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
              </th>
              <th className="px-4 py-3">Quotation #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Valid Until</th>
              <th className="px-4 py-3 text-right">Total Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No quotations found
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
                      href={`/quotations/${row.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{row.client.name}</p>
                    {row.client.clientId && (
                      <p className="text-xs text-muted-foreground">{row.client.clientId}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(row.quotationDate)}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(getValidUntilFromDate(row.quotationDate))}
                  </td>
                  <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.grandTotal)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/quotations/${row.id}`}>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/quotations/${row.id}/edit`}>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onDownload(row)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        title="Convert to Invoice"
                        disabled={convertingId === row.id}
                        onClick={() => onConvert(row)}
                      >
                        <FileInput className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
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
          Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total} quotations
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
