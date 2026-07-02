"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { RecordPaymentForm, type PaymentFormData } from "@/components/credits/record-payment-form";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  invoiceId: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  note: z.string(),
  paymentMethod: z.string(),
});

export default function RecordPaymentContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const preselectedInvoice = searchParams.get("invoiceId") || "";
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [outstanding, setOutstanding] = useState(0);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string; remainingBalance: number }[]>([]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceId: "",
      amount: 0,
      note: "",
      paymentMethod: "cash",
    },
  });

  useEffect(() => {
    api.get(`/clients/${id}`).then((res) => {
      const c = res.data;
      setClientName(c.name);
      setClientCode(c.clientId);
      setOutstanding(c.creditBalance);
      setInvoices(
        c.invoices
          .filter((i: { remainingBalance: number }) => i.remainingBalance > 0)
          .map((i: { id: string; invoiceNumber: string; remainingBalance: number }) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            remainingBalance: i.remainingBalance,
          }))
      );
      setLoading(false);
      if (preselectedInvoice) {
        form.setValue("invoiceId", preselectedInvoice);
      }
    });
  }, [id, form, preselectedInvoice]);

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      await api.post("/credits", {
        clientId: id,
        invoiceId: data.invoiceId || undefined,
        amount: data.amount,
        note: data.note || undefined,
        paymentMethod: data.paymentMethod || undefined,
      });
      toast.success("Payment recorded successfully");
      router.push(`/credits/${id}`);
    } catch {
      toast.error("Failed to record payment");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <RecordPaymentForm
        form={form}
        clientName={clientName}
        clientId={clientCode}
        outstandingBalance={outstanding}
        invoices={invoices}
        onSubmit={onSubmit}
        onCancel={() => router.push(`/credits/${id}`)}
        isSubmitting={form.formState.isSubmitting}
      />
    </div>
  );
}
