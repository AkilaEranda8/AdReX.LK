"use client";

import { Wallet, CircleDollarSign, Clock, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn, formatNumber } from "@/lib/utils";

interface ExpenseStatCardsProps {
  totalExpenses: number;
  thisMonth: number;
  pendingCount: number;
  pendingAmount: number;
}

const cards = [
  {
    key: "total",
    label: "Total Expenses",
    sub: "All time (paid + pending)",
    icon: Wallet,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "month",
    label: "This Month",
    sub: "Current month total",
    icon: CircleDollarSign,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "pendingCount",
    label: "Pending",
    sub: "Awaiting payment",
    icon: Clock,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "pendingAmount",
    label: "Pending Amount",
    sub: "Unpaid expenses",
    icon: Ban,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function ExpenseStatCards({
  totalExpenses,
  thisMonth,
  pendingCount,
  pendingAmount,
}: ExpenseStatCardsProps) {
  const values = {
    total: totalExpenses,
    month: thisMonth,
    pendingCount,
    pendingAmount,
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
