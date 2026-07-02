import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Parse API dates without timezone shift (e.g. 2026-07-02T00:00:00.000Z → Jul 2 locally). */
function parseLocalDate(date: string | Date): Date {
  if (typeof date === "string") {
    const dateOnly = date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
  }
  return typeof date === "string" ? new Date(date) : date;
}

/** Stable number formatting — avoids SSR/client locale hydration mismatches. */
export function formatNumber(value: number): string {
  const [whole, frac] = String(Math.round(value * 100) / 100).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${withCommas}.${frac}` : withCommas;
}

export function formatCurrency(amount: number): string {
  const fixed = (Math.round(amount * 100) / 100).toFixed(2);
  const [whole, frac] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs. ${withCommas}.${frac}`;
}

export function formatDate(date: string | Date): string {
  const d = parseLocalDate(date);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateGB(date: string | Date): string {
  const d = parseLocalDate(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function getCurrentMonthRangeLabel(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${formatDate(start)} - ${formatDate(end)}`;
}
