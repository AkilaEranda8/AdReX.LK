export type InvoiceWorkflowStatus = "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";
export type PaymentStatusValue = "NONE" | "UNPAID" | "PARTIALLY_PAID" | "PAID";

export const INVOICE_WORKFLOW_OPTIONS: { value: InvoiceWorkflowStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  NONE: "—",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
};

export const INVOICE_WORKFLOW_LABELS: Record<InvoiceWorkflowStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function resolveManualInvoiceWorkflow(
  invoiceStatus: InvoiceWorkflowStatus,
  invoice: {
    grandTotal: number;
    advancePayment: number;
    remainingBalance: number;
    invoiceStatus: string;
  },
  paymentsSum: number
) {
  if (invoiceStatus === "DRAFT") {
    return { invoiceStatus, remainingBalance: 0, paymentStatus: "NONE" as PaymentStatusValue };
  }

  if (invoiceStatus === "CANCELLED") {
    return { invoiceStatus, remainingBalance: 0, paymentStatus: "NONE" as PaymentStatusValue };
  }

  const fullOwed = Math.max(
    0,
    Math.round((invoice.grandTotal - invoice.advancePayment - paymentsSum) * 100) / 100
  );

  let remainingBalance = fullOwed;
  if (invoiceStatus === "COMPLETED" && fullOwed <= 0) {
    remainingBalance = 0;
  }

  const paymentStatus = derivePaymentStatus(remainingBalance, invoice.grandTotal);

  return { invoiceStatus, remainingBalance, paymentStatus };
}

export function derivePaymentStatus(
  remainingBalance: number,
  grandTotal: number,
  isDraft = false
): PaymentStatusValue {
  if (isDraft) return "NONE";
  if (remainingBalance <= 0) return "PAID";
  if (remainingBalance < grandTotal) return "PARTIALLY_PAID";
  return "UNPAID";
}

export function getCreditDiffForWorkflowChange(
  existing: { invoiceStatus: string; remainingBalance: number },
  newRemaining: number,
  newInvoiceStatus: InvoiceWorkflowStatus
) {
  const oldCreditImpact = existing.invoiceStatus === "DRAFT" ? 0 : existing.remainingBalance;
  const newCreditImpact =
    newInvoiceStatus === "DRAFT" || newInvoiceStatus === "CANCELLED" ? 0 : newRemaining;
  return newCreditImpact - oldCreditImpact;
}
