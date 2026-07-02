"use client";

import {
  FileSpreadsheet,
  CircleDollarSign,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn, formatNumber } from "@/lib/utils";

interface QuotationStatCardsProps {
  totalQuotations: number;
  totalValue: number;
  thisMonth: number;
  averageValue: number;
}

const cards = [
  {
    key: "total",
    label: "Total Quotations",
    sub: "All Time",
    icon: FileSpreadsheet,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "value",
    label: "Total Value",
    sub: null,
    icon: CircleDollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "month",
    label: "This Month",
    sub: "Quotations created",
    icon: CalendarDays,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "average",
    label: "Average Value",
    sub: "Per quotation",
    icon: TrendingUp,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function QuotationStatCards({
  totalQuotations,
  totalValue,
  thisMonth,
  averageValue,
}: QuotationStatCardsProps) {
  const values = {
    total: totalQuotations,
    value: totalValue,
    month: thisMonth,
    average: averageValue,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = values[card.key];
        return (
          <Card key={card.key} className="border-slate-200/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", card.iconBg)}>
                <Icon className={cn("h-6 w-6", card.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="truncate text-xl font-bold text-slate-900">{card.format(value)}</p>
                {card.sub && <p className="text-[11px] text-muted-foreground">{card.sub}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
