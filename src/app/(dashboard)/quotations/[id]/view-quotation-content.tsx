"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  Pencil,
  FileInput,
  Send,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt-document";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadPDF, printPDF } from "@/lib/pdf";
import { getValidUntilFromDate } from "@/lib/quotation-form";
import { fetchCompanyForPdf, type PdfCompanyInfo } from "@/lib/pdf-settings";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil?: string;
  status: string;
  grandTotal: number;
  client: { name: string; clientId: string; email: string; contactNumber: string };
  items: { itemName: string; price: number; quantity: number; total: number }[];
}

export default function ViewQuotationContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [company, setCompany] = useState<PdfCompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/quotations/${id}`), fetchCompanyForPdf()])
      .then(([res, companyInfo]) => {
        setQuotation(res.data);
        setCompany(companyInfo);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await api.post(`/quotations/${id}/convert`);
      toast.success("Converted to invoice successfully");
      router.push(`/invoices/${res.data.id}`);
    } catch {
      toast.error("Failed to convert");
    } finally {
      setConverting(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      const res = await api.post(`/quotations/${id}/send`);
      if (res.data.sent) toast.success("Email sent to client");
      else toast.error(res.data.message || "Configure SMTP in .env");
    } catch {
      toast.error("Failed to send email");
    }
  };

  const handleSendSms = async () => {
    setSendingSms(true);
    try {
      const res = await api.post(`/quotations/${id}/send-sms`, {});
      if (res.data.sent) toast.success("SMS sent to client");
      else toast.error(res.data.message || "SMS not sent — configure SMS in Settings");
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!quotation) return null;

  const pdfData = {
    type: "quotation" as const,
    number: quotation.quotationNumber,
    date: quotation.quotationDate,
    client: quotation.client,
    items: quotation.items,
    grandTotal: quotation.grandTotal,
  };

  const validUntil = quotation.validUntil || getValidUntilFromDate(quotation.quotationDate);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/quotations">
            <Button variant="outline" size="icon" className="mt-1 h-9 w-9 shrink-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{quotation.quotationNumber}</h1>
              <span className="inline-flex rounded-md bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                {quotation.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued on {formatDate(quotation.quotationDate)} · Valid until {formatDate(validUntil)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/quotations/${id}/edit`}>
            <Button variant="outline" className="gap-2 rounded-lg">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 rounded-lg" onClick={() => downloadPDF(pdfData)}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button className="gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700" onClick={() => printPDF(pdfData)}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-200/80 shadow-sm print:border-0 print:shadow-none">
            <CardContent className="p-4 sm:p-6 print:p-0">
              <PaymentReceiptDocument
                title="QUOTATION"
                documentNumber={quotation.quotationNumber}
                documentDate={quotation.quotationDate}
                clientName={quotation.client.name}
                items={quotation.items}
                subTotal={quotation.grandTotal}
                balanceDue={quotation.grandTotal}
                showPaymentInfo={false}
                company={company || undefined}
              />
            </CardContent>
          </Card>
        </div>

        <div className="no-print space-y-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quotation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-indigo-50 p-4 text-center">
                <p className="text-xs font-medium text-indigo-600">Grand Total</p>
                <p className="mt-1 text-2xl font-bold text-indigo-700">
                  {formatCurrency(quotation.grandTotal)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={handleSendEmail}>
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 rounded-lg"
                onClick={handleSendSms}
                disabled={sendingSms}
              >
                <MessageSquare className="h-4 w-4" />
                {sendingSms ? "Sending..." : "Send SMS"}
              </Button>
              <Button
                className="w-full gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700"
                onClick={handleConvert}
                disabled={converting || quotation.status === "CONVERTED"}
              >
                <FileInput className="h-4 w-4" />
                {converting ? "Converting..." : "Convert to Invoice"}
              </Button>
              <Link href={`/quotations/${id}/edit`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2 rounded-lg">
                  <Pencil className="h-4 w-4" />
                  Edit Quotation
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
