"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  Pencil,
  Mail,
  Phone,
  CreditCard,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt-document";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { downloadPDF, printPDF } from "@/lib/pdf";
import { buildInvoicePdfData } from "@/lib/invoice-pdf";
import { getInvoiceDocumentTitle, getInvoiceDocumentMeta } from "@/lib/receipt-document";
import { getWhatsAppPaymentLink } from "@/lib/whatsapp";
import { InvoiceStatusControl } from "@/components/invoices/invoice-status-control";
import type { InvoiceWorkflowStatus } from "@/lib/invoice-status";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface InvoiceDetail {
  id: string;
  clientId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subTotal: number;
  discount: number;
  advancePayment: number;
  grandTotal: number;
  remainingBalance: number;
  invoiceStatus: string;
  paymentStatus: string;
  client: { name: string; clientId: string; email: string; contactNumber: string };
  items: { itemName: string; price: number; quantity: number; total: number }[];
  payments?: { amount: number; paymentDate: string; note?: string }[];
}

function StatusBadge({ status, type }: { status: string; type: "payment" | "invoice" }) {
  const paymentConfig: Record<string, { label: string; className: string }> = {
    NONE: { label: "—", className: "bg-slate-100 text-slate-500" },
    PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
    PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-100 text-amber-700" },
    UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-700" },
  };
  const invoiceConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
    PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700" },
    COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  };
  const c =
    (type === "payment" ? paymentConfig : invoiceConfig)[status] ||
    (type === "payment" ? paymentConfig.UNPAID : invoiceConfig.PENDING);
  return (
    <span className={cn("inline-flex rounded-md px-3 py-1 text-xs font-semibold", c.className)}>
      {c.label}
    </span>
  );
}

function getDueDate(date: string) {
  const d = new Date(date);
  d.setDate(d.getDate() + 30);
  return d;
}

export default function ViewInvoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  const loadInvoice = () => {
    return api.get(`/invoices/${id}`).then((res) => {
      setInvoice(res.data);
      return res.data as InvoiceDetail;
    });
  };

  const handlePrint = async (data: InvoiceDetail) => {
    const pdfData = await buildInvoicePdfData(data);
    printPDF(pdfData);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const pdfData = await buildInvoicePdfData(invoice);
      downloadPDF(pdfData);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  useEffect(() => {
    loadInvoice().then((data) => {
      setLoading(false);
      if (searchParams.get("print") === "true") {
        setTimeout(() => handlePrint(data), 500);
      }
    });
  }, [id, searchParams]);

  const handleStatusChange = async (invoiceStatus: InvoiceWorkflowStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await api.patch(`/invoices/${id}/status`, { invoiceStatus });
      setInvoice(res.data);
      toast.success("Invoice status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      const res = await api.post(`/invoices/${id}/send`);
      if (res.data.sent) toast.success("Email sent to client");
      else toast.error(res.data.message || "Email not sent — configure SMTP in Settings");
    } catch {
      toast.error("Failed to send email");
    }
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    const msg = `Hello ${invoice.client.name}, your invoice ${invoice.invoiceNumber} balance is ${formatCurrency(invoice.remainingBalance)}. Please make payment and send the receipt.`;
    window.open(getWhatsAppPaymentLink(invoice.client.contactNumber, msg), "_blank");
  };

  const handleSendSms = async (template: "invoiceSent" | "invoiceReminder" = "invoiceSent") => {
    setSendingSms(true);
    try {
      const res = await api.post(`/invoices/${id}/send-sms`, { template });
      if (res.data.sent) toast.success("SMS sent to client");
      else toast.error(res.data.message || "SMS not sent — configure SMS in Settings");
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!invoice) return null;

  const documentTitle = getInvoiceDocumentTitle(
    invoice.remainingBalance,
    invoice.invoiceStatus,
    invoice.paymentStatus
  );
  const documentMeta = getInvoiceDocumentMeta(
    invoice.remainingBalance,
    invoice.invoiceStatus,
    invoice.paymentStatus
  );

  const paidAmount = invoice.grandTotal - invoice.remainingBalance;
  const dueDate = getDueDate(invoice.invoiceDate);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.paymentStatus} type="payment" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued on {formatDate(invoice.invoiceDate)} · Due {formatDate(dueDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/invoices/${id}/edit`}>
            <Button variant="outline" className="gap-2 rounded-lg">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 rounded-lg" onClick={handleDownloadPdf}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => handlePrint(invoice)}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Document — AdReX.LK receipt template */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-border bg-muted/50 shadow-md print:border-0 print:bg-transparent print:shadow-none">
            <CardContent className="p-4 sm:p-6 print:p-0">
              <PaymentReceiptDocument
                title={documentTitle}
                documentNumber={invoice.invoiceNumber}
                documentDate={invoice.invoiceDate}
                clientName={invoice.client.name}
                items={invoice.items}
                subTotal={invoice.subTotal}
                discount={Math.abs(invoice.discount)}
                advance={invoice.advancePayment}
                balanceDue={invoice.remainingBalance}
                dateLabel={documentMeta.dateLabel}
                numberLabel={documentMeta.numberLabel}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="no-print space-y-4">
          {/* Payment Summary */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Grand Total</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{formatCurrency(invoice.grandTotal)}</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-indigo-500/10 p-4 text-center dark:bg-indigo-500/10">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Outstanding Balance</p>
                <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(invoice.remainingBalance)}
                </p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <StatusBadge status={invoice.paymentStatus} type="payment" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoice Status</span>
                <StatusBadge status={invoice.invoiceStatus} type="invoice" />
              </div>
              <div className="border-t pt-4">
                <InvoiceStatusControl
                  invoiceStatus={invoice.invoiceStatus}
                  onChange={handleStatusChange}
                  disabled={updatingStatus}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Payment status updates automatically when payments are recorded.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">{invoice.client.name}</p>
                <p className="text-muted-foreground">{invoice.client.clientId}</p>
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  {invoice.client.email}
                </p>
                <p className="flex items-center gap-2 text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  {invoice.client.contactNumber}
                </p>
              </div>
              <Link href={`/clients`}>
                <Button variant="outline" size="sm" className="mt-1 w-full rounded-lg">
                  View Client Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-emerald-700">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                    </div>
                    {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/credits/${invoice.clientId}/payment?invoiceId=${id}`}>
                <Button variant="outline" className="w-full justify-start gap-2 rounded-lg">
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={handleDownloadPdf}>
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={handleSendEmail}>
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 rounded-lg"
                onClick={() => handleSendSms("invoiceSent")}
                disabled={sendingSms}
              >
                <MessageSquare className="h-4 w-4" />
                {sendingSms ? "Sending..." : "Send SMS"}
              </Button>
              {invoice.remainingBalance > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 rounded-lg"
                  onClick={() => handleSendSms("invoiceReminder")}
                  disabled={sendingSms}
                >
                  <MessageSquare className="h-4 w-4" />
                  SMS Payment Reminder
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={handleWhatsApp}>
                <Phone className="h-4 w-4" />
                WhatsApp Reminder
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
