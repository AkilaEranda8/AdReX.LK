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

interface QuotationFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  period: string;
  onPeriodChange: (v: string) => void;
  onClear: () => void;
}

export function QuotationFilters({
  search,
  onSearchChange,
  period,
  onPeriodChange,
  onClear,
}: QuotationFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by quotation number, client..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 rounded-lg border-border bg-muted/50 pl-10"
        />
      </div>

      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border-border lg:w-[160px]">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
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
