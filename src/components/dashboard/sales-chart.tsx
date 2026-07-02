"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SalesData {
  label: string;
  thisMonth: number;
  lastMonth: number;
}

export function SalesChart({ data }: { data: SalesData[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.thisMonth, d.lastMonth]), 1);
  const width = 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toPoints = (key: "thisMonth" | "lastMonth") =>
    data
      .map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + chartH - (d[key] / maxVal) * chartH;
        return `${x},${y}`;
      })
      .join(" ");

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + chartH - pct * chartH,
    label: `${Math.round((maxVal * pct) / 1000)}k`,
  }));

  const xStep = Math.ceil(data.length / 6);
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Sales Overview</CardTitle>
        <Select defaultValue="monthly">
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            This Month
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            Last Month
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]">
            {yLabels.map((l) => (
              <g key={l.label}>
                <line
                  x1={padding.left}
                  y1={l.y}
                  x2={width - padding.right}
                  y2={l.y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text x={padding.left - 8} y={l.y + 4} textAnchor="end" className="fill-slate-400 text-[9px]">
                  {l.label}
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              points={toPoints("lastMonth")}
            />
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              points={toPoints("thisMonth")}
            />
            {xLabels.map((d) => {
              const i = data.indexOf(d);
              const x = padding.left + (i / (data.length - 1)) * chartW;
              return (
                <text key={d.label} x={x} y={height - 5} textAnchor="middle" className="fill-slate-400 text-[9px]">
                  {d.label}
                </text>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
