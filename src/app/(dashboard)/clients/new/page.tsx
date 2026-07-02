"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateClientForm, type ClientFormData } from "@/components/clients/create-client-form";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string(),
});

export default function NewClientPage() {
  const router = useRouter();

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

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      await api.post("/clients", data);
      toast.success("Client created successfully");
      router.push("/clients");
    } catch {
      toast.error("Failed to create client");
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <CreateClientForm
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/clients")}
        isSubmitting={form.formState.isSubmitting}
      />
    </div>
  );
}
