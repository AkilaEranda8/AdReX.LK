"use client";

import {
  RefreshCw,
  CircleDollarSign,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn, formatNumber } from "@/lib/utils";

interface RecurringStatCardsProps {
  totalSchedules: number;
  activeSchedules: number;
  dueThisWeek: number;
  monthlyValue: number;
}

const cards = [
  {
    key: "total",
    label: "Total Schedules",
    sub: "All recurring",
    icon: RefreshCw,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "active",
    label: "Active",
    sub: "Currently running",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "due",
    label: "Due This Week",
    sub: "Next 7 days",
    icon: CalendarClock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "value",
    label: "Monthly Value",
    sub: "Active schedules",
    icon: CircleDollarSign,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function RecurringStatCards({
  totalSchedules,
  activeSchedules,
  dueThisWeek,
  monthlyValue,
}: RecurringStatCardsProps) {
  const values = {
    total: totalSchedules,
    active: activeSchedules,
    due: dueThisWeek,
    value: monthlyValue,
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
