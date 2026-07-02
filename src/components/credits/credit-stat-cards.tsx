"use client";

import { Users, CircleDollarSign, Coins, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn, formatNumber } from "@/lib/utils";

interface CreditStatCardsProps {
  totalClients: number;
  totalCreditSales: number;
  totalReceived: number;
  outstandingBalance: number;
}

const cards = [
  {
    key: "clients",
    label: "Credit Clients",
    sub: "With outstanding balance",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "sales",
    label: "Total Credit Sales",
    sub: "All invoiced credit",
    icon: CircleDollarSign,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "received",
    label: "Total Received",
    sub: "Payments collected",
    icon: Coins,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "outstanding",
    label: "Outstanding Balance",
    sub: "Pending collection",
    icon: Wallet,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function CreditStatCards({
  totalClients,
  totalCreditSales,
  totalReceived,
  outstandingBalance,
}: CreditStatCardsProps) {
  const values = {
    clients: totalClients,
    sales: totalCreditSales,
    received: totalReceived,
    outstanding: outstandingBalance,
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
