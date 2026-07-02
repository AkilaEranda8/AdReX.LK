"use client";

import {
  TrendingUp,
  Wallet,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";

interface ReportStatCardsProps {
  monthlySales: number;
  totalOutstanding: number;
  totalCollected: number;
  overdueCount: number;
  overdueAmount: number;
}

const cards = [
  {
    key: "sales",
    label: "Period Sales",
    sub: "Invoices in selected period",
    icon: TrendingUp,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    key: "collected",
    label: "Total Collected",
    sub: "All payments received",
    icon: CircleDollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    key: "outstanding",
    label: "Outstanding",
    sub: "Client credit balance",
    icon: Wallet,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    key: "overdue",
    label: "Overdue",
    sub: "Invoices past due date",
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
] as const;

export function ReportStatCards({
  monthlySales,
  totalOutstanding,
  totalCollected,
  overdueCount,
  overdueAmount,
}: ReportStatCardsProps) {
  const values = {
    sales: formatCurrency(monthlySales),
    collected: formatCurrency(totalCollected),
    outstanding: formatCurrency(totalOutstanding),
    overdue: `${overdueCount} · ${formatCurrency(overdueAmount)}`,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="border-slate-200/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", card.iconBg)}>
                <Icon className={cn("h-6 w-6", card.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="truncate text-xl font-bold text-slate-900">{values[card.key]}</p>
                {card.sub && <p className="text-[11px] text-muted-foreground">{card.sub}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
