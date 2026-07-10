"use client";

import Link from "next/link";
import {
  Eye,
  Pencil,
  Trash2,
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
import { TableScroll } from "@/components/ui/table-scroll";
import {
  MobileRecordActions,
  MobileRecordCard,
  MobileRecordRow,
} from "@/components/ui/mobile-record-card";

export interface ExpenseRow {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  paymentMethod: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
}

function StatusBadge({ status }: { status: ExpenseRow["status"] }) {
  const styles = {
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };
  const labels = { PAID: "Paid", PENDING: "Pending", CANCELLED: "Cancelled" };
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

interface ExpenseTableProps {
  data: ExpenseRow[];
  selected: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (row: ExpenseRow) => void;
  onDelete: (row: ExpenseRow) => void;
}

export function ExpenseTable({
  data,
  selected,
  onSelectAll,
  onSelect,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="space-y-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No expenses found</p>
        ) : (
          rows.map((row) => {
            const isSelected = selected.includes(row.id);
            return (
              <MobileRecordCard key={row.id} selected={isSelected}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Checkbox checked={isSelected} onCheckedChange={(c) => onSelect(row.id, !!c)} />
                    <div className="min-w-0">
                      <Link href={`/expenses/${row.id}`} className="font-semibold text-indigo-600 hover:underline">
                        {row.expenseNumber}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">{row.category}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold">{formatCurrency(row.amount)}</p>
                </div>
                <div className="space-y-2">
                  <MobileRecordRow label="Date">{formatDate(row.expenseDate)}</MobileRecordRow>
                  {row.vendor && <MobileRecordRow label="Vendor">{row.vendor}</MobileRecordRow>}
                  <MobileRecordRow label="Description">
                    <span className="line-clamp-2">{row.description}</span>
                  </MobileRecordRow>
                  <MobileRecordRow label="Status">
                    <StatusBadge status={row.status} />
                  </MobileRecordRow>
                </div>
                <MobileRecordActions>
                  <Link href={`/expenses/${row.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={() => onEdit(row)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-red-600" onClick={() => onDelete(row)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </MobileRecordActions>
              </MobileRecordCard>
            );
          })
        )}
      </div>

      <TableScroll className="hidden md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
              </th>
              <th className="px-4 py-3">Expense #</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No expenses found
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
                      <span className="font-medium text-indigo-600">{row.expenseNumber}</span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{formatDate(row.expenseDate)}</td>
                    <td className="px-4 py-4">{row.category}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.vendor || "—"}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/expenses/${row.id}`}
                        prefetch={false}
                        className="font-medium text-foreground hover:text-indigo-600"
                      >
                        {row.description}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold text-red-500">{formatCurrency(row.amount)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" asChild>
                          <Link href={`/expenses/${row.id}`} prefetch={false}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableScroll>

      <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total} expenses
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Rows per page</span>
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
