"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";

export interface SalesTrendPoint {
  label: string;
  sales: number;
  collected: number;
}

export interface TopClientPoint {
  name: string;
  amount: number;
}

export interface PaymentMethodPoint {
  method: string;
  amount: number;
}

export interface ExpenseCategoryPoint {
  category: string;
  amount: number;
}

export interface ReportChartsData {
  salesTrend: SalesTrendPoint[];
  invoiceStatus: {
    paid: number;
    partiallyPaid: number;
    pending: number;
    overdue: number;
  };
  topClients: TopClientPoint[];
  paymentMethods: PaymentMethodPoint[];
  expensesByCategory: ExpenseCategoryPoint[];
}

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

export function ReportSalesChart({ data }: { data: SalesTrendPoint[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.sales, d.collected]), 1);
  const width = 640;
  const height = 240;
  const padding = { top: 12, right: 12, bottom: 36, left: 52 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const groupW = chartW / Math.max(data.length, 1);
  const barW = Math.min(14, groupW * 0.32);

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + chartH - pct * chartH,
    label: formatAxisValue(maxVal * pct),
  }));

  const xStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Sales vs Collections</CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-indigo-500" />
            Sales
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-emerald-500" />
            Collected
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-touch">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-0">
            {yLabels.map((l) => (
              <g key={l.label}>
                <line
                  x1={padding.left}
                  y1={l.y}
                  x2={width - padding.right}
                  y2={l.y}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={l.y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[9px]"
                >
                  {l.label}
                </text>
              </g>
            ))}
            {data.map((point, i) => {
              const cx = padding.left + i * groupW + groupW / 2;
              const salesH = (point.sales / maxVal) * chartH;
              const collectedH = (point.collected / maxVal) * chartH;
              return (
                <g key={`${point.label}-${i}`}>
                  <rect
                    x={cx - barW - 2}
                    y={padding.top + chartH - salesH}
                    width={barW}
                    height={salesH}
                    rx="3"
                    className="fill-indigo-500"
                  />
                  <rect
                    x={cx + 2}
                    y={padding.top + chartH - collectedH}
                    width={barW}
                    height={collectedH}
                    rx="3"
                    className="fill-emerald-500"
                  />
                  {(i % xStep === 0 || i === data.length - 1) && (
                    <text
                      x={cx}
                      y={height - 10}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[9px]"
                    >
                      {point.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportTopClientsChart({ data }: { data: TopClientPoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const barH = 28;
  const gap = 12;
  const chartW = 280;
  const height = Math.max(160, data.length * (barH + gap) + 24);

  if (data.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top Outstanding Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No outstanding balances</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Outstanding Clients</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${chartW + 120} ${height}`} className="w-full">
          {data.map((item, i) => {
            const y = 12 + i * (barH + gap);
            const barWidth = (item.amount / maxVal) * chartW;
            return (
              <g key={item.name}>
                <text x={0} y={y + 18} className="fill-muted-foreground text-[10px]">
                  {item.name.length > 14 ? `${item.name.slice(0, 14)}…` : item.name}
                </text>
                <rect
                  x={120}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  className="fill-amber-500/90"
                />
                <text
                  x={120 + barWidth + 8}
                  y={y + 18}
                  className="fill-foreground text-[10px] font-medium"
                >
                  {formatCurrency(item.amount)}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export function ReportPaymentMethodsChart({ data }: { data: PaymentMethodPoint[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  if (data.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Payments by Method</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No payments in this period</p>
        </CardContent>
      </Card>
    );
  }

  let cumulative = 0;
  const radius = 58;
  const cx = 78;
  const cy = 78;

  const arcs = data.map((item, index) => {
    const pct = item.amount / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...item, d, color: colors[index % colors.length], pct };
  });

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Payments by Method</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <svg width="156" height="156" viewBox="0 0 156 156" className="shrink-0">
            {arcs.map((arc) => (
              <path key={arc.method} d={arc.d} fill={arc.color} opacity={0.92} />
            ))}
            <circle cx={cx} cy={cy} r={36} className="fill-card" />
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground text-sm font-bold">
              {formatCurrency(total)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">
              Total
            </text>
          </svg>
          <div className="w-full flex-1 space-y-2">
            {arcs.map((arc) => (
              <div key={arc.method} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: arc.color }} />
                  <span className="truncate text-muted-foreground">{arc.method}</span>
                </div>
                <span className="shrink-0 font-semibold">{(arc.pct * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportExpensesByCategoryChart({ data }: { data: ExpenseCategoryPoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.amount), 1);

  if (data.length === 0) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No expenses in this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 400 200" className="w-full">
          {data.map((item, index) => {
            const barWidth = (item.amount / maxVal) * 220;
            const y = index * 28 + 8;
            return (
              <g key={item.category}>
                <text x={0} y={y + 14} className="fill-muted-foreground text-[10px]">
                  {item.category.length > 14 ? `${item.category.slice(0, 14)}…` : item.category}
                </text>
                <rect x={120} y={y} width={barWidth} height={18} rx={4} className="fill-red-400" opacity={0.85} />
                <text x={120 + barWidth + 8} y={y + 14} className="fill-foreground text-[10px] font-medium">
                  {formatCurrency(item.amount)}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export function ReportChartsSection({ charts }: { charts: ReportChartsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportSalesChart data={charts.salesTrend} />
        </div>
        <InvoiceStatusChart data={charts.invoiceStatus} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportTopClientsChart data={charts.topClients} />
        <ReportPaymentMethodsChart data={charts.paymentMethods} />
      </div>
      {charts.expensesByCategory.length > 0 && (
        <ReportExpensesByCategoryChart data={charts.expensesByCategory} />
      )}
    </div>
  );
}
