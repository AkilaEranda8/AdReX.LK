"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InvoiceStatusData {
  paid: number;
  partiallyPaid: number;
  pending: number;
  overdue: number;
}

const COLORS = {
  paid: "#3b82f6",
  partiallyPaid: "#22c55e",
  pending: "#f59e0b",
  overdue: "#ef4444",
};

export function InvoiceStatusChart({ data }: { data: InvoiceStatusData }) {
  const total = data.paid + data.partiallyPaid + data.pending + data.overdue || 1;
  const segments = [
    { key: "paid", label: "Paid", value: data.paid, color: COLORS.paid },
    { key: "partiallyPaid", label: "Partially Paid", value: data.partiallyPaid, color: COLORS.partiallyPaid },
    { key: "pending", label: "Pending", value: data.pending, color: COLORS.pending },
    { key: "overdue", label: "Overdue", value: data.overdue, color: COLORS.overdue },
  ];

  let cumulative = 0;
  const radius = 60;
  const cx = 80;
  const cy = 80;

  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const pct = seg.value / total;
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      cumulative += pct;
      const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = pct > 0.5 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { ...seg, d, pct };
    });

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Invoice Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <svg width="160" height="160" viewBox="0 0 160 160">
              {arcs.map((arc) => (
                <path key={arc.key} d={arc.d} fill={arc.color} opacity={0.9} />
              ))}
              <circle cx={cx} cy={cy} r={38} className="fill-card" />
              <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-xl font-bold">
                {total}
              </text>
              <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
                Total
              </text>
            </svg>
          </div>
          <div className="flex-1 space-y-2.5">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-muted-foreground">{seg.label}</span>
                </div>
                <span className="font-semibold">{((seg.value / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
