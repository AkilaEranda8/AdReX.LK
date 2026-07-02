"use client";

import { Users, UserCheck, UserX, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn, formatNumber } from "@/lib/utils";

interface ClientStatCardsProps {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalCredit: number;
}

const cards = [
  {
    key: "total",
    label: "Total Clients",
    sub: "All Time",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "active",
    label: "Active Clients",
    sub: "Currently active",
    icon: UserCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "inactive",
    label: "Inactive Clients",
    sub: "Deactivated",
    icon: UserX,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "credit",
    label: "Outstanding Credit",
    sub: "Total balance",
    icon: Wallet,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function ClientStatCards({
  totalClients,
  activeClients,
  inactiveClients,
  totalCredit,
}: ClientStatCardsProps) {
  const values = {
    total: totalClients,
    active: activeClients,
    inactive: inactiveClients,
    credit: totalCredit,
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
