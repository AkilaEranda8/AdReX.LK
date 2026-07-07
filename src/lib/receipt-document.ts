import { parseItemName } from "@/lib/invoice-form";
import { formatDateGB } from "@/lib/utils";

export interface ReceiptLineItem {
  itemName: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ReceiptDocumentProps {
  title?: string;
  documentNumber: string;
  documentDate: string | Date;
  clientName: string;
  items: ReceiptLineItem[];
  subTotal: number;
  discount?: number;
  taxRate?: number;
  grandTotal?: number;
  advance?: number;
  balanceDue: number;
  className?: string;
  dateLabel?: string;
  numberLabel?: string;
  showPaymentInfo?: boolean;
}

export function formatReceiptAmount(value: number) {
  const fixed = (Math.round(value * 100) / 100).toFixed(2);
  const [whole, frac] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${frac}`;
}

export function formatReceiptDate(date: string | Date) {
  return formatDateGB(date);
}

export function mapReceiptItems(items: ReceiptLineItem[]) {
  return items.map((item, index) => {
    const parsed = parseItemName(item.itemName);
    return {
      no: index + 1,
      item: parsed.itemName,
      description: parsed.description,
      qty: item.quantity,
      rate: item.price,
      total: item.total,
    };
  });
}

export function getInvoiceDocumentTitle(
  remainingBalance: number,
  invoiceStatus?: string,
  paymentStatus?: string
) {
  if (invoiceStatus === "DRAFT") return "DRAFT INVOICE";
  if (remainingBalance <= 0 || paymentStatus === "PAID") return "PAYMENT RECEIPT";
  return "INVOICE";
}

export function getInvoiceDocumentMeta(
  remainingBalance: number,
  invoiceStatus?: string,
  paymentStatus?: string
) {
  const isReceipt = remainingBalance <= 0 || paymentStatus === "PAID";
  return {
    dateLabel: isReceipt ? "Receipt Date" : "Invoice Date",
    numberLabel: isReceipt ? "Receipt No" : "Invoice No",
  };
}

export function getReceiptTotals(subTotal: number, discount = 0, advance = 0, balanceDue?: number) {
  const subTotalLessDiscount = Math.round((subTotal - discount) * 100) / 100;
  const due = balanceDue ?? Math.max(0, subTotalLessDiscount - advance);
  return { subTotal, discount, subTotalLessDiscount, advance, balanceDue: due };
}

export interface InvoiceReceiptTotals {
  subTotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  subTotalLessDiscount: number;
  advance: number;
  balanceDue: number;
}

export function getInvoiceReceiptTotals(invoice: {
  subTotal: number;
  discount: number;
  taxRate: number;
  grandTotal: number;
  advancePayment: number;
  remainingBalance: number;
}): InvoiceReceiptTotals {
  const taxRate = invoice.taxRate || 0;
  if (taxRate > 0) {
    const taxableBase = Math.round((invoice.grandTotal / (1 + taxRate / 100)) * 100) / 100;
    const taxAmount = Math.round((invoice.grandTotal - taxableBase) * 100) / 100;
    const userDiscount = Math.max(0, Math.round((invoice.subTotal - taxableBase) * 100) / 100);
    return {
      subTotal: invoice.subTotal,
      discount: userDiscount,
      taxRate,
      taxAmount,
      grandTotal: invoice.grandTotal,
      subTotalLessDiscount: taxableBase,
      advance: invoice.advancePayment,
      balanceDue: invoice.remainingBalance,
    };
  }

  const userDiscount = Math.max(0, invoice.discount);
  const subTotalLessDiscount = Math.round((invoice.subTotal - userDiscount) * 100) / 100;
  return {
    subTotal: invoice.subTotal,
    discount: userDiscount,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: invoice.grandTotal ?? subTotalLessDiscount,
    subTotalLessDiscount,
    advance: invoice.advancePayment,
    balanceDue: invoice.remainingBalance,
  };
}
