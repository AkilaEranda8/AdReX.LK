"use client";

import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  trend: string;
  trendUp?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sparkline?: number[];
  isCurrency?: boolean;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  trend,
  trendUp = true,
  icon: Icon,
  iconBg,
  iconColor,
  sparkline,
  isCurrency,
}: StatCardProps) {
  const displayValue =
    typeof value === "number"
      ? isCurrency
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{displayValue}</p>
            </div>
          </div>
          {sparkline && <MiniSparkline data={sparkline} color={trendUp ? "#22c55e" : "#ef4444"} />}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
