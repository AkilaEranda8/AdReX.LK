"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { CreateInvoiceForm, type InvoiceFormData } from "@/components/invoices/create-invoice-form";
import { buildInvoiceApiPayload } from "@/lib/invoice-form";
import { uploadPendingAttachments } from "@/components/attachments/attachment-upload";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  clientId: z.string().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string(),
  paymentTerms: z.string(),
  reference: z.string(),
  notes: z.string(),
  taxRate: z.number().min(0),
  items: z.array(
    z.object({
      itemName: z.string().min(1, "Item name required"),
      description: z.string(),
      price: z.number().min(0),
      quantity: z.number().min(1),
      itemDiscount: z.number().min(0),
    })
  ).min(1, "At least one item required"),
  discount: z.number().min(0),
  advancePayment: z.number().min(0),
});

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") || "";
  const [clients, setClients] = useState<{ id: string; clientId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const dueDefault = new Date();
  dueDefault.setDate(dueDefault.getDate() + 30);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      dueDate: dueDefault.toISOString().split("T")[0],
      paymentTerms: "net_30",
      reference: "",
      notes: "",
      taxRate: 0,
      items: [{ itemName: "", description: "", price: 0, quantity: 1, itemDiscount: 0 }],
      discount: 0,
      advancePayment: 0,
    },
  });

  useEffect(() => {
    api.get("/clients/active").then((res) => {
      setClients(res.data);
      if (preselectedClientId && res.data.some((c: { id: string }) => c.id === preselectedClientId)) {
        form.setValue("clientId", preselectedClientId);
      }
      setLoading(false);
    });
  }, [form, preselectedClientId]);

  const saveInvoice = async (isDraft: boolean) => {
    if (!isDraft) {
      const valid = await form.trigger();
      if (!valid) return;
    } else if (!form.getValues("clientId")) {
      toast.error("Select a client to save draft");
      return;
    }

    try {
      const res = await api.post("/invoices", buildInvoiceApiPayload(form.getValues(), isDraft));
      if (pendingFiles.length > 0 && res.data?.id) {
        await uploadPendingAttachments(pendingFiles, { invoiceId: res.data.id });
      }
      const sms = res.data?.sms as { sent?: boolean; skipped?: boolean; message?: string } | undefined;
      const paymentSms = res.data?.paymentSms as { sent?: boolean; skipped?: boolean; message?: string } | undefined;
      if (!isDraft && (sms?.sent || paymentSms?.sent)) {
        const parts = [sms?.sent && "invoice", paymentSms?.sent && "advance payment"].filter(Boolean);
        toast.success(`Invoice created — ${parts.join(" & ")} SMS sent`);
      } else if (!isDraft && ((sms && !sms.skipped && !sms.sent) || (paymentSms && !paymentSms.skipped && !paymentSms.sent))) {
        toast.success("Invoice created successfully");
        if (sms && !sms.skipped && !sms.sent) toast.error(`Invoice SMS: ${sms.message}`);
        if (paymentSms && !paymentSms.skipped && !paymentSms.sent) toast.error(`Payment SMS: ${paymentSms.message}`);
      } else {
        toast.success(isDraft ? "Draft saved" : "Invoice created successfully");
      }
      router.push("/invoices");
    } catch {
      toast.error("Failed to save invoice");
    }
  };

  const onSubmit = () => saveInvoice(false);
  const onSaveDraft = () => saveInvoice(true);

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <CreateInvoiceForm
        form={form}
        clients={clients}
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
        onCancel={() => router.back()}
        isSubmitting={form.formState.isSubmitting}
        pendingFiles={pendingFiles}
        onPendingFilesChange={setPendingFiles}
      />
    </div>
  );
}
