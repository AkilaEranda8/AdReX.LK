"use client";

import { useEffect } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Eye,
  Send,
  FileSpreadsheet,
  ChevronDown,
  UserPlus,
  ArrowLeft,
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
import { formatCurrency } from "@/lib/utils";
import { getValidUntilFromDate } from "@/lib/quotation-form";
import { AttachmentUpload, type AttachmentItem } from "@/components/attachments/attachment-upload";

export interface QuotationFormData {
  clientId: string;
  date: string;
  validUntil: string;
  reference: string;
  notes: string;
  items: {
    itemName: string;
    description: string;
    price: number;
    quantity: number;
  }[];
}

interface Client {
  id: string;
  clientId: string;
  name: string;
}

interface CreateQuotationFormProps {
  form: UseFormReturn<QuotationFormData>;
  clients: Client[];
  onSubmit: () => void;
  onSaveDraft?: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  quotationNumber?: string;
  viewHref?: string;
  quotationId?: string;
  attachments?: AttachmentItem[];
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  onAttachmentsChange?: () => void;
}

function calcLineTotal(price: number, qty: number) {
  return Math.round(price * qty * 100) / 100;
}

export function CreateQuotationForm({
  form,
  clients,
  onSubmit,
  onSaveDraft,
  onCancel,
  isSubmitting,
  mode = "create",
  quotationNumber,
  viewHref,
  quotationId,
  attachments = [],
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentsChange,
}: CreateQuotationFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items") || [];
  const date = watch("date");

  const subTotal = items.reduce(
    (sum, item) =>
      sum + calcLineTotal(Number(item.price) || 0, Number(item.quantity) || 0),
    0
  );
  const grandTotal = Math.round(subTotal * 100) / 100;

  useEffect(() => {
    if (date) {
      setValue("validUntil", getValidUntilFromDate(date));
    }
  }, [date, setValue]);

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
          <Button type="button" variant="outline" size="icon" className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === "edit" ? "Edit Quotation" : "Create Quotation"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "edit"
                ? quotationNumber
                  ? `Update quotation ${quotationNumber}`
                  : "Update quotation details"
                : "Fill in the details to create a new quotation"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel}>
            Cancel
          </Button>
          {mode === "edit" && viewHref && (
            <Link href={viewHref}>
              <Button type="button" variant="outline" className="gap-2 rounded-lg">
                <Eye className="h-4 w-4" />
                View Quotation
              </Button>
            </Link>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Quotation" : "Save Quotation"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                Quotation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Client <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Link href="/clients/new">
                    <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 rounded-lg text-indigo-600">
                      <UserPlus className="h-4 w-4" />
                      Add Client
                    </Button>
                  </Link>
                </div>
                {errors.clientId && <p className="text-sm text-destructive">Client is required</p>}
              </div>

              <div className="space-y-2">
                <Label>Quotation Number</Label>
                <Input
                  value={mode === "edit" && quotationNumber ? quotationNumber : "Auto-generated"}
                  disabled
                  className="rounded-lg bg-slate-50 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label>Validity Period</Label>
                <Select defaultValue="30">
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Quotation Date <span className="text-red-500">*</span>
                </Label>
                <Input type="date" className="rounded-lg" {...register("date")} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" className="rounded-lg" {...register("validUntil")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reference (Optional)</Label>
                <Input placeholder="PO Number, Project ID, etc." className="rounded-lg" {...register("reference")} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Quotation Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-touch">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-2 w-8">#</th>
                      <th className="pb-3 pr-2">Item Name</th>
                      <th className="pb-3 pr-2">Description</th>
                      <th className="pb-3 pr-2 w-28">Price (Rs.)</th>
                      <th className="pb-3 pr-2 w-20">Qty</th>
                      <th className="pb-3 pr-2 w-28 text-right">Total (Rs.)</th>
                      <th className="pb-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const price = Number(watch(`items.${index}.price`)) || 0;
                      const qty = Number(watch(`items.${index}.quantity`)) || 0;
                      const lineTotal = calcLineTotal(price, qty);
                      return (
                        <tr key={field.id} className="border-b last:border-0">
                          <td className="py-3 pr-2 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 pr-2">
                            <Input
                              placeholder="Item name"
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.itemName`)}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <Input
                              placeholder="Description"
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.description`)}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.price`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <Input
                              type="number"
                              step="1"
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="py-3 pr-2 text-right font-medium">{formatCurrency(lineTotal)}</td>
                          <td className="py-3">
                            {fields.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 gap-1 rounded-lg"
                onClick={() => append({ itemName: "", description: "", price: 0, quantity: 1 })}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
              {errors.items && (
                <p className="mt-2 text-sm text-destructive">At least one item is required</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add terms, conditions, or notes for this quotation..."
                className="min-h-[100px] resize-none rounded-lg"
                {...register("notes")}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentUpload
                quotationId={quotationId}
                existing={attachments}
                pendingFiles={pendingFiles}
                onPendingChange={onPendingFilesChange}
                onAttachmentsChange={onAttachmentsChange}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quotation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="rounded-lg bg-violet-50 px-3 py-2.5">
                <p className="text-xs font-medium text-violet-700">Valid Until</p>
                <p className="text-sm font-semibold text-violet-900">
                  {watch("validUntil")
                    ? new Date(watch("validUntil")).toLocaleDateString("en-LK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button type="button" variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={onSaveDraft} disabled={!onSaveDraft || isSubmitting}>
                <FileSpreadsheet className="h-4 w-4" />
                Save as Draft
              </Button>
              {mode === "edit" && viewHref && (
                <Link href={viewHref} className="block">
                  <Button type="button" variant="outline" className="w-full justify-start gap-2 rounded-lg">
                    <Eye className="h-4 w-4" />
                    Preview Quotation
                  </Button>
                </Link>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : mode === "edit"
                    ? "Update Quotation"
                    : "Save Quotation"}
                <ChevronDown className="ml-auto h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
