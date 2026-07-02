import type { QuotationFormData } from "@/components/quotations/create-quotation-form";

export { parseItemName } from "@/lib/invoice-form";

export function buildQuotationApiPayload(data: QuotationFormData, isDraft = false) {
  return {
    clientId: data.clientId,
    quotationDate: data.date,
    validUntil: data.validUntil || null,
    reference: data.reference || null,
    notes: data.notes || null,
    isDraft,
    items: data.items.map((item) => ({
      itemName: item.description ? `${item.itemName} - ${item.description}` : item.itemName,
      price: item.price,
      quantity: item.quantity,
    })),
  };
}

export function getValidUntilFromDate(date: string, days = 30) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
