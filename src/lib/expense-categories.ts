export const EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Utilities",
  "Rent",
  "Salaries",
  "Transport",
  "Marketing",
  "Equipment",
  "Software",
  "Maintenance",
  "Other",
] as const;

export const EXPENSE_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Cheque",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];
