"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { CreateInvoiceForm, type InvoiceFormData } from "@/components/invoices/create-invoice-form";
import type { AttachmentItem } from "@/components/attachments/attachment-upload";
import { buildInvoiceApiPayload, getDueDateFromInvoiceDate, parseItemName } from "@/lib/invoice-form";
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

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [clients, setClients] = useState<{ id: string; clientId: string; name: string }[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttachments = useCallback(() => {
    api.get(`/attachments?invoiceId=${id}`).then((res) => setAttachments(res.data));
  }, [id]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
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
    Promise.all([api.get("/clients/active"), api.get(`/invoices/${id}`)]).then(([clientsRes, invoiceRes]) => {
      setClients(clientsRes.data);
      const inv = invoiceRes.data;
      const invoiceDate = new Date(inv.invoiceDate).toISOString().split("T")[0];

      setInvoiceNumber(inv.invoiceNumber);
      form.reset({
        clientId: inv.clientId,
        date: invoiceDate,
        dueDate: inv.dueDate
          ? new Date(inv.dueDate).toISOString().split("T")[0]
          : getDueDateFromInvoiceDate(invoiceDate),
        paymentTerms: "net_30",
        reference: inv.reference || "",
        notes: inv.notes || "",
        taxRate: inv.taxRate || 0,
        items: inv.items.map((i: { itemName: string; price: number; quantity: number }) => {
          const parsed = parseItemName(i.itemName);
          return {
            itemName: parsed.itemName,
            description: parsed.description,
            price: i.price,
            quantity: i.quantity,
            itemDiscount: 0,
          };
        }),
        discount: inv.discount,
        advancePayment: inv.advancePayment,
      });
      setLoading(false);
      loadAttachments();
    });
  }, [id, form, loadAttachments]);

  const saveInvoice = async (isDraft: boolean) => {
    if (!isDraft) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    try {
      await api.put(`/invoices/${id}`, buildInvoiceApiPayload(form.getValues(), isDraft));
      toast.success(isDraft ? "Draft saved" : "Invoice updated successfully");
      router.push(`/invoices/${id}`);
    } catch {
      toast.error("Failed to update invoice");
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
        onCancel={() => router.push(`/invoices/${id}`)}
        isSubmitting={form.formState.isSubmitting}
        mode="edit"
        invoiceNumber={invoiceNumber}
        viewHref={`/invoices/${id}`}
        previewHref={`/invoices/${id}`}
        invoiceId={id}
        attachments={attachments}
        onAttachmentsChange={loadAttachments}
      />
    </div>
  );
}
