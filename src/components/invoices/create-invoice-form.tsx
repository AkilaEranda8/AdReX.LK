"use client";

import { useEffect, useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Eye,
  Send,
  FileText,
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
import { formatCurrency, cn } from "@/lib/utils";
import { AttachmentUpload, type AttachmentItem } from "@/components/attachments/attachment-upload";

export interface InvoiceFormData {
  clientId: string;
  date: string;
  dueDate: string;
  paymentTerms: string;
  reference: string;
  notes: string;
  taxRate: number;
  items: {
    itemName: string;
    description: string;
    price: number;
    quantity: number;
    itemDiscount: number;
  }[];
  discount: number;
  advancePayment: number;
}

interface Client {
  id: string;
  clientId: string;
  name: string;
}

interface CreateInvoiceFormProps {
  form: UseFormReturn<InvoiceFormData>;
  clients: Client[];
  onSubmit: () => void;
  onSaveDraft?: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  invoiceNumber?: string;
  viewHref?: string;
  previewHref?: string;
  invoiceId?: string;
  attachments?: AttachmentItem[];
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  onAttachmentsChange?: () => void;
}

function calcLineTotal(price: number, qty: number, disc: number) {
  const base = price * qty;
  return Math.round((base - base * (disc / 100)) * 100) / 100;
}

export function CreateInvoiceForm({
  form,
  clients,
  onSubmit,
  onSaveDraft,
  onCancel,
  isSubmitting,
  mode = "create",
  invoiceNumber,
  viewHref,
  previewHref,
  invoiceId,
  attachments = [],
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentsChange,
}: CreateInvoiceFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items") || [];
  const discount = watch("discount") || 0;
  const advancePayment = watch("advancePayment") || 0;
  const taxRate = watch("taxRate") || 0;

  const subTotal = items.reduce(
    (sum, item) =>
      sum + calcLineTotal(Number(item.price) || 0, Number(item.quantity) || 0, Number(item.itemDiscount) || 0),
    0
  );
  const afterDiscount = Math.round((subTotal - discount) * 100) / 100;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100;
  const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;
  const remainingBalance = Math.round((grandTotal - advancePayment) * 100) / 100;

  useEffect(() => {
    const invoiceDate = watch("date");
    if (invoiceDate && !watch("dueDate")) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + 30);
      setValue("dueDate", d.toISOString().split("T")[0]);
    }
  }, [watch, setValue]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      {/* Page header actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === "edit" ? "Edit Invoice" : "Create Invoice"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "edit"
                ? invoiceNumber
                  ? `Update invoice ${invoiceNumber}`
                  : "Update invoice details"
                : "Fill in the details to create a new invoice"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel}>
            Cancel
          </Button>
          {mode === "edit" && viewHref && (
            <Link href={viewHref}>
              <Button type="button" variant="outline" className="gap-2 rounded-lg">
                <Eye className="h-4 w-4" />
                View Invoice
              </Button>
            </Link>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Invoice" : "Save Invoice"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Invoice Details */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-indigo-600" />
                Invoice Details
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
                      Add New Client
                    </Button>
                  </Link>
                </div>
                {errors.clientId && <p className="text-sm text-destructive">Client is required</p>}
              </div>

              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={mode === "edit" && invoiceNumber ? invoiceNumber : "Auto-generated"}
                  disabled
                  className="rounded-lg bg-slate-50 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select value={watch("paymentTerms")} onValueChange={(v) => setValue("paymentTerms", v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Invoice Date <span className="text-red-500">*</span>
                </Label>
                <Input type="date" className="rounded-lg" {...register("date")} />
              </div>
              <div className="space-y-2">
                <Label>
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input type="date" className="rounded-lg" {...register("dueDate")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reference (Optional)</Label>
                <Input placeholder="PO Number, Project ID, etc." className="rounded-lg" {...register("reference")} />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-2 w-8">#</th>
                      <th className="pb-3 pr-2">Item Name</th>
                      <th className="pb-3 pr-2">Description</th>
                      <th className="pb-3 pr-2 w-28">Price (Rs.)</th>
                      <th className="pb-3 pr-2 w-20">Qty</th>
                      <th className="pb-3 pr-2 w-24">Discount (%)</th>
                      <th className="pb-3 pr-2 w-28 text-right">Total (Rs.)</th>
                      <th className="pb-3 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const price = Number(watch(`items.${index}.price`)) || 0;
                      const qty = Number(watch(`items.${index}.quantity`)) || 0;
                      const disc = Number(watch(`items.${index}.itemDiscount`)) || 0;
                      const total = calcLineTotal(price, qty, disc);
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
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <Input
                              type="number"
                              className="h-9 rounded-lg"
                              {...register(`items.${index}.itemDiscount`, { valueAsNumber: true })}
                            />
                          </td>
                          <td className="py-3 pr-2 text-right font-medium">{formatCurrency(total)}</td>
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
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() =>
                    append({ itemName: "", description: "", price: 0, quantity: 1, itemDiscount: 0 })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
                <Button type="button" variant="outline" className="gap-2 rounded-lg">
                  <Plus className="h-4 w-4" />
                  Add Custom Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[100px] rounded-lg"
                placeholder="Add any additional notes..."
                {...register("notes")}
              />
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentUpload
                invoiceId={invoiceId}
                existing={attachments}
                pendingFiles={pendingFiles}
                onPendingChange={onPendingFilesChange}
                onAttachmentsChange={onAttachmentsChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 w-24 rounded-lg text-right"
                  {...register("discount", { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tax</span>
                <Select value={String(taxRate)} onValueChange={(v) => setValue("taxRate", Number(v))}>
                  <SelectTrigger className="h-8 w-28 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Tax</SelectItem>
                    <SelectItem value="15">VAT 15%</SelectItem>
                    <SelectItem value="18">VAT 18%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax Amount</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Advance Payment</span>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 w-28 rounded-lg text-right"
                  {...register("advancePayment", { valueAsNumber: true })}
                />
              </div>
              <div className="flex justify-between rounded-lg bg-indigo-50 px-3 py-2.5">
                <span className="font-medium text-indigo-900">Remaining Balance</span>
                <span className="font-bold text-indigo-600">{formatCurrency(remainingBalance)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select defaultValue="credit">
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <span
                  className={cn(
                    "inline-flex rounded-md px-3 py-1.5 text-xs font-medium",
                    remainingBalance <= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : advancePayment > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  )}
                >
                  {remainingBalance <= 0 ? "Paid" : advancePayment > 0 ? "Partially Paid" : "Unpaid"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button type="button" variant="outline" className="w-full justify-start gap-2 rounded-lg" onClick={onSaveDraft} disabled={!onSaveDraft || isSubmitting}>
                <FileText className="h-4 w-4" />
                Save as Draft
              </Button>
              {previewHref ? (
                <Link href={previewHref} className="block">
                  <Button type="button" variant="outline" className="w-full justify-start gap-2 rounded-lg">
                    <Eye className="h-4 w-4" />
                    Preview Invoice
                  </Button>
                </Link>
              ) : null}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : mode === "edit"
                    ? "Update Invoice"
                    : "Save & Send Invoice"}
                <ChevronDown className="ml-auto h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
