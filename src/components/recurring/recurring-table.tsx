"use client";

import { useState } from "react";
import {
  Play,
  Trash2,
  Pause,
  PlayCircle,
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
import { FREQUENCY_LABELS, isDueSoon, isOverdue } from "@/lib/recurring";

export interface RecurringRow {
  id: string;
  frequency: string;
  nextDate: string;
  active: boolean;
  discount: number;
  itemsJson: string;
  itemCount: number;
  total: number;
  client: { name: string; clientId: string; contactNumber?: string };
}

function StatusBadge({ active, nextDate }: { active: boolean; nextDate: string }) {
  if (!active) {
    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        Paused
      </span>
    );
  }
  if (isOverdue(nextDate)) {
    return (
      <span className="inline-flex rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
        Overdue
      </span>
    );
  }
  if (isDueSoon(nextDate)) {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        Due Soon
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
      Active
    </span>
  );
}

interface RecurringTableProps {
  data: RecurringRow[];
  selected: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onGenerate: (row: RecurringRow) => void;
  onToggleActive: (row: RecurringRow) => void;
  onDelete: (row: RecurringRow) => void;
  generatingId: string | null;
  togglingId: string | null;
}

export function RecurringTable({
  data,
  selected,
  onSelectAll,
  onSelect,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onGenerate,
  onToggleActive,
  onDelete,
  generatingId,
  togglingId,
}: RecurringTableProps) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="w-12 px-4 py-3">
                <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
              </th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Next Date</th>
              <th className="px-4 py-3 text-center">Items</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No recurring invoices found
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
                    <p className="font-medium text-foreground">{row.client.name}</p>
                    <p className="text-xs text-muted-foreground">{row.client.clientId}</p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {FREQUENCY_LABELS[row.frequency] || row.frequency}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(row.nextDate)}</td>
                  <td className="px-4 py-4 text-center">{row.itemCount}</td>
                  <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.total)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge active={row.active} nextDate={row.nextDate} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={!row.active || generatingId === row.id}
                        onClick={() => onGenerate(row)}
                        title="Generate invoice now"
                      >
                        <Play className="h-4 w-4" />
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
                            <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                disabled={togglingId === row.id}
                                onClick={() => {
                                  setMenuId(null);
                                  onToggleActive(row);
                                }}
                              >
                                {row.active ? (
                                  <>
                                    <Pause className="h-4 w-4" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="h-4 w-4" />
                                    Resume
                                  </>
                                )}
                              </button>
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
          Showing {total === 0 ? 0 : start + 1} to {Math.min(start + pageSize, total)} of {total} schedules
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
