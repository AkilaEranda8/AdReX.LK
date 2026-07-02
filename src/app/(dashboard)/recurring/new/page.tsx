"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLoader } from "@/components/ui/loading";
import { CreateRecurringForm, type RecurringFormData } from "@/components/recurring/create-recurring-form";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  clientId: z.string().min(1, "Client is required"),
  frequency: z.string().min(1),
  nextDate: z.string().min(1, "Next date is required"),
  dayOfMonth: z.number().min(0).max(28),
  discount: z.number().min(0),
  notes: z.string(),
  active: z.boolean(),
  items: z.array(
    z.object({
      itemName: z.string().min(1, "Item name required"),
      price: z.number().min(0),
      quantity: z.number().min(1),
    })
  ).min(1, "At least one item required"),
});

export default function NewRecurringPage() {
  const router = useRouter();
  const [clients, setClients] = useState<{ id: string; clientId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<RecurringFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: "",
      frequency: "monthly",
      nextDate: new Date().toISOString().split("T")[0],
      dayOfMonth: 0,
      discount: 0,
      notes: "",
      active: true,
      items: [{ itemName: "", price: 0, quantity: 1 }],
    },
  });

  useEffect(() => {
    api.get("/clients/active").then((res) => {
      setClients(res.data);
      setLoading(false);
    });
  }, []);

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();
    try {
      await api.post("/recurring", {
        clientId: data.clientId,
        frequency: data.frequency,
        nextDate: data.nextDate,
        dayOfMonth: data.frequency === "monthly" && data.dayOfMonth > 0 ? data.dayOfMonth : null,
        discount: data.discount,
        notes: data.notes || null,
        active: data.active,
        items: data.items,
      });
      toast.success("Recurring schedule created");
      router.push("/recurring");
    } catch {
      toast.error("Failed to create recurring schedule");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <CreateRecurringForm
        form={form}
        clients={clients}
        onSubmit={onSubmit}
        onCancel={() => router.push("/recurring")}
        isSubmitting={form.formState.isSubmitting}
      />
    </div>
  );
}
