import type { InvoiceFormData } from "@/components/invoices/create-invoice-form";

export function parseItemName(fullName: string) {
  const sep = fullName.indexOf(" - ");
  if (sep === -1) return { itemName: fullName, description: "" };
  return {
    itemName: fullName.slice(0, sep),
    description: fullName.slice(sep + 3),
  };
}

export function buildInvoiceApiPayload(data: InvoiceFormData, isDraft = false) {
  const taxRate = data.taxRate || 0;
  const subTotal = data.items.reduce((sum, item) => {
    const base = item.price * item.quantity;
    const afterItemDisc = base - base * ((item.itemDiscount || 0) / 100);
    return sum + afterItemDisc;
  }, 0);
  const afterUserDiscount = subTotal - (data.discount || 0);
  const grandTotalWithTax = afterUserDiscount * (1 + taxRate / 100);
  const apiDiscount = Math.round((subTotal - grandTotalWithTax) * 100) / 100;

  return {
    clientId: data.clientId,
    invoiceDate: data.date,
    dueDate: data.dueDate || null,
    reference: data.reference || null,
    notes: data.notes || null,
    taxRate,
    isDraft,
    items: data.items.map((item) => ({
      itemName: item.description ? `${item.itemName} - ${item.description}` : item.itemName,
      price: Math.round(item.price * (1 - (item.itemDiscount || 0) / 100) * 100) / 100,
      quantity: item.quantity,
    })),
    discount: apiDiscount,
    advancePayment: isDraft ? 0 : data.advancePayment || 0,
  };
}

export function getDueDateFromInvoiceDate(date: string, days = 30) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function isInvoiceOverdue(
  dueDate: Date | string | null | undefined,
  paymentStatus: string,
  invoiceStatus?: string
) {
  if (!dueDate || paymentStatus === "PAID" || invoiceStatus === "DRAFT" || invoiceStatus === "CANCELLED") {
    return false;
  }
  return new Date(dueDate) < new Date();
}
