"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type FormData = z.infer<typeof schema>;

interface Client {
  id: string;
  clientId: string;
  name: string;
  contactNumber: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE" },
  });

  const status = watch("status");

  useEffect(() => {
    if (open) {
      reset(
        client
          ? { name: client.name, contactNumber: client.contactNumber, email: client.email, status: client.status }
          : { name: "", contactNumber: "", email: "", status: "ACTIVE" }
      );
    }
  }, [open, client, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (client) {
        await api.put(`/clients/${client.id}`, data);
        toast.success("Client updated successfully");
      } else {
        await api.post("/clients", data);
        toast.success("Client created successfully");
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Failed to save client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              {client ? <Users className="h-5 w-5 text-indigo-600" /> : <UserPlus className="h-5 w-5 text-indigo-600" />}
            </div>
            {client ? "Edit Client" : "Add New Client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {client && (
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input value={client.clientId} disabled className="rounded-lg bg-slate-50 font-medium" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input id="name" placeholder="Enter client name" className="rounded-lg" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">
              Contact Number <span className="text-red-500">*</span>
            </Label>
            <Input id="contactNumber" placeholder="+94 77 123 4567" className="rounded-lg" {...register("contactNumber")} />
            {errors.contactNumber && <p className="text-sm text-destructive">{errors.contactNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input id="email" type="email" placeholder="client@example.com" className="rounded-lg" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              {isSubmitting ? "Saving..." : client ? "Update Client" : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
