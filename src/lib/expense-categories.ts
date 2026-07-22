/** Operational expenses reduce profit */
export const OPERATIONAL_EXPENSE_CATEGORIES = [
  "Salaries",
  "Rent",
  "Utilities",
  "Transport",
  "Software",
  "Internet",
  "Office Expenses",
  "Office Supplies",
  "Maintenance",
  "Other Expenses",
  "Other",
] as const;

/** Growth expenses are paid from company savings only — do not reduce profit */
export const GROWTH_EXPENSE_CATEGORIES = [
  "Marketing",
  "Promotions",
  "Sponsorships",
  "Software Development",
  "Research",
  "Equipment Purchase",
  "Business Expansion",
  "Equipment",
] as const;

/** @deprecated use OPERATIONAL + GROWTH lists; kept for backward-compatible filters */
export const EXPENSE_CATEGORIES = [
  ...new Set([...OPERATIONAL_EXPENSE_CATEGORIES, ...GROWTH_EXPENSE_CATEGORIES]),
] as const;

export const EXPENSE_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Cheque",
  "Other",
] as const;

export type OperationalExpenseCategory = (typeof OPERATIONAL_EXPENSE_CATEGORIES)[number];
export type GrowthExpenseCategory = (typeof GROWTH_EXPENSE_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];
export type ExpenseKind = "OPERATIONAL" | "GROWTH";

export function resolveExpenseKind(category: string, explicit?: ExpenseKind): ExpenseKind {
  if (explicit === "GROWTH" || explicit === "OPERATIONAL") return explicit;
  if ((GROWTH_EXPENSE_CATEGORIES as readonly string[]).includes(category)) return "GROWTH";
  return "OPERATIONAL";
}
