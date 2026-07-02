"use client";

import { UseFormReturn } from "react-hook-form";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ClientFormData {
  name: string;
  contactNumber: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
}

interface CreateClientFormProps {
  form: UseFormReturn<ClientFormData>;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  clientId?: string;
}

export function CreateClientForm({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = "create",
  clientId,
}: CreateClientFormProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  const name = watch("name");
  const contactNumber = watch("contactNumber");
  const email = watch("email");
  const status = watch("status");

  const isActive = status === "ACTIVE";
  const filledFields = [name, contactNumber, email].filter(Boolean).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-0.5 h-9 w-9 shrink-0 rounded-lg"
            onClick={onCancel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === "edit" ? "Edit Client" : "Add New Client"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "edit"
                ? clientId
                  ? `Update details for ${clientId}`
                  : "Update client information"
                : "Fill in the details to register a new client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Client" : "Create Client"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <User className="h-5 w-5 text-indigo-600" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {mode === "edit" && clientId && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Client ID</Label>
                  <Input value={clientId} disabled className="rounded-lg bg-slate-50 font-medium text-indigo-600" />
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  Client Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name or company name"
                  className="rounded-lg"
                  {...register("name")}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="contactNumber"
                    placeholder="+94 77 123 4567"
                    className="rounded-lg pl-10"
                    {...register("contactNumber")}
                  />
                </div>
                {errors.contactNumber && (
                  <p className="text-sm text-destructive">{errors.contactNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    className="rounded-lg pl-10"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Status <span className="text-red-500">*</span>
                </Label>
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
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about this client (optional)..."
                className="min-h-[120px] resize-none rounded-lg"
                {...register("notes")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{name || "Client Name"}</p>
                    <p className="truncate text-xs text-muted-foreground">{email || "email@example.com"}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {contactNumber || "Contact number"}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Client ID: {mode === "edit" && clientId ? clientId : "Auto-generated"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Account Status</span>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Credit Balance</span>
                <span className="text-sm font-semibold text-slate-700">Rs. 0.00</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Form Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Required fields</span>
                <span className="font-medium">{filledFields} / 3</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${(filledFields / 3) * 100}%` }}
                />
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  { label: "Client name", done: !!name },
                  { label: "Contact number", done: !!contactNumber },
                  { label: "Email address", done: !!email },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <CheckCircle2
                      className={cn("h-4 w-4", item.done ? "text-emerald-500" : "text-slate-300")}
                    />
                    <span className={item.done ? "text-slate-700" : "text-muted-foreground"}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-indigo-900">Quick Tip</p>
              <p className="mt-1 text-xs text-indigo-700/80">
                After creating a client, you can immediately use them when creating invoices or quotations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
