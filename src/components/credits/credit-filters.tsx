"use client";

import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreditFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  onClear: () => void;
}

export function CreditFilters({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  onClear,
}: CreditFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by client ID, name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 rounded-lg border-border bg-muted/50 pl-10"
        />
      </div>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="h-10 w-full rounded-lg border-border lg:w-[200px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="outstanding_desc">Highest Outstanding</SelectItem>
          <SelectItem value="outstanding_asc">Lowest Outstanding</SelectItem>
          <SelectItem value="name_asc">Name A-Z</SelectItem>
          <SelectItem value="name_desc">Name Z-A</SelectItem>
        </SelectContent>
      </Select>

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
