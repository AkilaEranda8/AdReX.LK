"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateClientForm, type ClientFormData } from "@/components/clients/create-client-form";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string(),
});

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");

  const form = useForm<ClientFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contactNumber: "",
      email: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  useEffect(() => {
    api
      .get(`/clients/${id}`)
      .then((res) => {
        const c = res.data;
        setClientId(c.clientId);
        form.reset({
          name: c.name,
          contactNumber: c.contactNumber,
          email: c.email,
          status: c.status,
          notes: c.notes || "",
        });
      })
      .catch(() => toast.error("Failed to load client"))
      .finally(() => setLoading(false));
  }, [id, form]);

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      await api.put(`/clients/${id}`, data);
      toast.success("Client updated successfully");
      router.push("/clients");
    } catch {
      toast.error("Failed to update client");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <CreateClientForm
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/clients")}
        isSubmitting={form.formState.isSubmitting}
        mode="edit"
        clientId={clientId}
      />
    </div>
  );
}
