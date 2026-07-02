"use client";

import { useEffect, useState } from "react";
import { getCurrentMonthRangeLabel } from "@/lib/utils";

/** Renders current month range label only after mount to avoid SSR hydration mismatch. */
export function ClientMonthRangeLabel({ className }: { className?: string }) {
  const [label, setLabel] = useState("This month");

  useEffect(() => {
    setLabel(getCurrentMonthRangeLabel());
  }, []);

  return <span className={className}>{label}</span>;
}
