"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { CreateQuotationForm, type QuotationFormData } from "@/components/quotations/create-quotation-form";
import { buildQuotationApiPayload, getValidUntilFromDate, parseItemName } from "@/lib/quotation-form";
import type { AttachmentItem } from "@/components/attachments/attachment-upload";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  clientId: z.string().min(1, "Client is required"),
  date: z.string().min(1, "Date is required"),
  validUntil: z.string(),
  reference: z.string(),
  notes: z.string(),
  items: z.array(
    z.object({
      itemName: z.string().min(1, "Item name required"),
      description: z.string(),
      price: z.number().min(0),
      quantity: z.number().min(1),
    })
  ).min(1, "At least one item required"),
});

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [clients, setClients] = useState<{ id: string; clientId: string; name: string }[]>([]);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttachments = useCallback(() => {
    api.get(`/attachments?quotationId=${id}`).then((res) => setAttachments(res.data));
  }, [id]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      reference: "",
      notes: "",
      items: [{ itemName: "", description: "", price: 0, quantity: 1 }],
    },
  });

  useEffect(() => {
    Promise.all([api.get("/clients/active"), api.get(`/quotations/${id}`)]).then(([clientsRes, qRes]) => {
      setClients(clientsRes.data);
      const q = qRes.data;
      const quotationDate = new Date(q.quotationDate).toISOString().split("T")[0];

      setQuotationNumber(q.quotationNumber);
      form.reset({
        clientId: q.clientId,
        date: quotationDate,
        validUntil: q.validUntil
          ? new Date(q.validUntil).toISOString().split("T")[0]
          : getValidUntilFromDate(quotationDate),
        reference: q.reference || "",
        notes: q.notes || "",
        items: q.items.map((i: { itemName: string; price: number; quantity: number }) => {
          const parsed = parseItemName(i.itemName);
          return {
            itemName: parsed.itemName,
            description: parsed.description,
            price: i.price,
            quantity: i.quantity,
          };
        }),
      });
      setLoading(false);
      loadAttachments();
    });
  }, [id, form, loadAttachments]);

  const saveQuotation = async (isDraft: boolean) => {
    if (!isDraft) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    try {
      const res = await api.put(`/quotations/${id}`, buildQuotationApiPayload(form.getValues(), isDraft));
      const sms = res.data?.sms as { sent?: boolean; skipped?: boolean; message?: string } | undefined;
      if (!isDraft && sms?.sent) {
        toast.success("Quotation updated — SMS sent to client");
      } else if (!isDraft && sms && !sms.skipped) {
        toast.success("Quotation updated successfully");
        toast.error(`SMS failed: ${sms.message}`);
      } else {
        toast.success(isDraft ? "Draft saved" : "Quotation updated successfully");
      }
      router.push(`/quotations/${id}`);
    } catch {
      toast.error("Failed to update quotation");
    }
  };

  const onSubmit = () => saveQuotation(false);
  const onSaveDraft = () => saveQuotation(true);

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <CreateQuotationForm
        form={form}
        clients={clients}
        onSubmit={onSubmit}
        onSaveDraft={onSaveDraft}
        onCancel={() => router.push(`/quotations/${id}`)}
        isSubmitting={form.formState.isSubmitting}
        mode="edit"
        quotationNumber={quotationNumber}
        viewHref={`/quotations/${id}`}
        quotationId={id}
        attachments={attachments}
        onAttachmentsChange={loadAttachments}
      />
    </div>
  );
}
