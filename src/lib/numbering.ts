import { prisma } from "./prisma";

export async function generateClientId(): Promise<string> {
  const counter = await prisma.sequenceCounter.upsert({
    where: { id: "client" },
    update: { value: { increment: 1 } },
    create: { id: "client", value: 1 },
  });
  return `CLI-${String(counter.value).padStart(6, "0")}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const counterId = `invoice-${yearMonth}`;

  const counter = await prisma.sequenceCounter.upsert({
    where: { id: counterId },
    update: { value: { increment: 1 } },
    create: { id: counterId, value: 1 },
  });
  return `INV-${yearMonth}-${String(counter.value).padStart(6, "0")}`;
}

export async function generateQuotationNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const counterId = `quotation-${yearMonth}`;

  const counter = await prisma.sequenceCounter.upsert({
    where: { id: counterId },
    update: { value: { increment: 1 } },
    create: { id: counterId, value: 1 },
  });
  return `QT-${yearMonth}-${String(counter.value).padStart(6, "0")}`;
}

export function calculateItemTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

export function calculateInvoiceTotals(
  items: { price: number; quantity: number }[],
  discount: number,
  advancePayment: number
) {
  const subTotal = items.reduce(
    (sum, item) => sum + calculateItemTotal(item.price, item.quantity),
    0
  );
  const grandTotal = Math.round((subTotal - discount) * 100) / 100;
  const remainingBalance = Math.round((grandTotal - advancePayment) * 100) / 100;
  return { subTotal, grandTotal, remainingBalance };
}

export function getPaymentStatus(
  remainingBalance: number,
  grandTotal: number,
  isDraft = false
): "NONE" | "UNPAID" | "PARTIALLY_PAID" | "PAID" {
  if (isDraft) return "NONE";
  if (remainingBalance <= 0) return "PAID";
  if (remainingBalance < grandTotal) return "PARTIALLY_PAID";
  return "UNPAID";
}

export function getInitialInvoiceStatus(isDraft: boolean): "DRAFT" | "PENDING" {
  return isDraft ? "DRAFT" : "PENDING";
}

/** @deprecated Use getPaymentStatus */
export function getInvoiceStatus(
  remainingBalance: number,
  grandTotal: number,
  isDraft = false
): "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" {
  if (isDraft) return "DRAFT";
  if (remainingBalance <= 0) return "PAID";
  if (remainingBalance < grandTotal) return "PARTIALLY_PAID";
  return "UNPAID";
}

export function syncInvoiceStatuses(
  remainingBalance: number,
  grandTotal: number,
  isDraft: boolean,
  currentInvoiceStatus?: string
) {
  const paymentStatus = getPaymentStatus(remainingBalance, grandTotal, isDraft);
  let invoiceStatus: "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED";

  if (isDraft) {
    invoiceStatus = "DRAFT";
  } else if (currentInvoiceStatus === "CANCELLED") {
    invoiceStatus = "CANCELLED";
  } else if (paymentStatus === "PAID") {
    invoiceStatus = "COMPLETED";
  } else if (currentInvoiceStatus === "DRAFT") {
    invoiceStatus = "PENDING";
  } else {
    invoiceStatus = (currentInvoiceStatus as typeof invoiceStatus) || "PENDING";
    if (invoiceStatus === "COMPLETED") {
      invoiceStatus = "PENDING";
    }
  }

  return { invoiceStatus, paymentStatus };
}
