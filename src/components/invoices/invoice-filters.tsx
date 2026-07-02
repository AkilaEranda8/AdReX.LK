"use client";

import { Search, Calendar, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ClientMonthRangeLabel } from "@/components/ui/client-month-range";

interface InvoiceFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (v: string) => void;
  onClear: () => void;
}

export function InvoiceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  onClear,
}: InvoiceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number, client..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 rounded-lg border-border bg-muted/50 pl-10"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border-border lg:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={paymentStatus} onValueChange={onPaymentStatusChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border-border lg:w-[180px]">
          <SelectValue placeholder="Payment Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payment Status</SelectItem>
          <SelectItem value="PAID">Paid</SelectItem>
          <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
          <SelectItem value="UNPAID">Unpaid</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        className="h-10 shrink-0 gap-2 rounded-lg border-border font-normal text-muted-foreground"
      >
        <Calendar className="h-4 w-4" />
        <ClientMonthRangeLabel className="hidden sm:inline" />
        <span className="sm:hidden">Date</span>
      </Button>

      <Button
        variant="outline"
        onClick={onClear}
        className="h-10 shrink-0 gap-2 rounded-lg border-border font-normal text-muted-foreground"
      >
        <RotateCcw className="h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  );
}
