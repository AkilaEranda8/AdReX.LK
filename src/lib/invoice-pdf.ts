import type { DocumentData } from "@/lib/pdf";
import { fetchCompanyForPdf } from "@/lib/pdf-settings";
import { getInvoiceDocumentTitle } from "@/lib/receipt-document";

type InvoicePdfSource = {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceStatus: string;
  paymentStatus: string;
  subTotal: number;
  discount: number;
  advancePayment: number;
  grandTotal: number;
  remainingBalance: number;
  client: DocumentData["client"];
  items: DocumentData["items"];
};

export async function buildInvoicePdfData(invoice: InvoicePdfSource): Promise<DocumentData> {
  const company = await fetchCompanyForPdf();
  return {
    type: "invoice",
    number: invoice.invoiceNumber,
    date: invoice.invoiceDate,
    client: invoice.client,
    items: invoice.items,
    subTotal: invoice.subTotal,
    discount: invoice.discount,
    advancePayment: invoice.advancePayment,
    grandTotal: invoice.grandTotal,
    remainingBalance: invoice.remainingBalance,
    invoiceStatus: invoice.invoiceStatus,
    paymentStatus: invoice.paymentStatus,
    documentTitle: getInvoiceDocumentTitle(
      invoice.remainingBalance,
      invoice.invoiceStatus,
      invoice.paymentStatus
    ),
    company,
  };
}
