"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { CreateQuotationForm, type QuotationFormData } from "@/components/quotations/create-quotation-form";
import { buildQuotationApiPayload, getValidUntilFromDate } from "@/lib/quotation-form";
import { uploadPendingAttachments } from "@/components/attachments/attachment-upload";
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

export default function NewQuotationPage() {
  const router = useRouter();
  const [clients, setClients] = useState<{ id: string; clientId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      validUntil: getValidUntilFromDate(today),
      reference: "",
      notes: "",
      items: [{ itemName: "", description: "", price: 0, quantity: 1 }],
    },
  });

  useEffect(() => {
    api.get("/clients/active").then((res) => {
      setClients(res.data);
      setLoading(false);
    });
  }, []);

  const saveQuotation = async (isDraft: boolean) => {
    if (!isDraft) {
      const valid = await form.trigger();
      if (!valid) return;
    } else if (!form.getValues("clientId")) {
      toast.error("Select a client to save draft");
      return;
    }
    try {
      const res = await api.post("/quotations", buildQuotationApiPayload(form.getValues(), isDraft));
      if (pendingFiles.length > 0 && res.data?.id) {
        await uploadPendingAttachments(pendingFiles, { quotationId: res.data.id });
      }
      toast.success(isDraft ? "Draft saved" : "Quotation created successfully");
      router.push("/quotations");
    } catch {
      toast.error("Failed to save quotation");
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
        onCancel={() => router.push("/quotations")}
        isSubmitting={form.formState.isSubmitting}
        pendingFiles={pendingFiles}
        onPendingFilesChange={setPendingFiles}
      />
    </div>
  );
}
