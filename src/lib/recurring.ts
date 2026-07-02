export interface RecurringLineItem {
  itemName: string;
  price: number;
  quantity: number;
}

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function parseRecurringItems(itemsJson: string): RecurringLineItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calcRecurringSubTotal(items: RecurringLineItem[]) {
  return Math.round(items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0) * 100) / 100;
}

export function calcRecurringTotal(items: RecurringLineItem[], discount = 0) {
  return Math.max(0, Math.round((calcRecurringSubTotal(items) - discount) * 100) / 100);
}

export function isDueSoon(nextDate: string | Date, days = 7) {
  const next = new Date(nextDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return next >= now && next <= limit;
}

export function isOverdue(nextDate: string | Date) {
  const next = new Date(nextDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return next < now;
}
