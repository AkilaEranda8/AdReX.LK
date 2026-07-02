"use client";

import {
  FileText,
  Coins,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoiceStatsProps {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
}

const cards = [
  {
    key: "total",
    label: "Total Invoices",
    sub: "All Time",
    icon: FileText,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "amount",
    label: "Total Amount",
    sub: null,
    icon: CircleDollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "paid",
    label: "Paid Amount",
    sub: null,
    icon: Coins,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "outstanding",
    label: "Outstanding",
    sub: null,
    icon: Wallet,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    format: (v: number) => formatCurrency(v),
  },
] as const;

export function InvoiceStatCards({ totalInvoices, totalAmount, paidAmount, outstanding }: InvoiceStatsProps) {
  const values = {
    total: totalInvoices,
    amount: totalAmount,
    paid: paidAmount,
    outstanding,
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
