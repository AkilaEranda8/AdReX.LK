"use client";

import { useFieldArray, UseFormReturn } from "react-hook-form";
import {
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
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
import { calcRecurringSubTotal, calcRecurringTotal } from "@/lib/recurring";

export interface RecurringFormData {
  clientId: string;
  frequency: string;
  nextDate: string;
  dayOfMonth: number;
  discount: number;
  notes: string;
  active: boolean;
  items: {
    itemName: string;
    price: number;
    quantity: number;
  }[];
}

interface Client {
  id: string;
  clientId: string;
  name: string;
}

interface CreateRecurringFormProps {
  form: UseFormReturn<RecurringFormData>;
  clients: Client[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function calcLineTotal(price: number, qty: number) {
  return Math.round(price * qty * 100) / 100;
}

export function CreateRecurringForm({
  form,
  clients,
  onSubmit,
  onCancel,
  isSubmitting,
}: CreateRecurringFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items") || [];
  const discount = watch("discount") || 0;
  const frequency = watch("frequency");
  const subTotal = calcRecurringSubTotal(items);
  const grandTotal = calcRecurringTotal(items, discount);

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
            <h1 className="text-2xl font-bold text-slate-900">Create Recurring Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up automatic invoice generation on a schedule
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
            {isSubmitting ? "Saving..." : "Save Schedule"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <RefreshCw className="h-5 w-5 text-indigo-600" />
                Schedule Details
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
                    <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-lg">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setValue("frequency", v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next Invoice Date</Label>
                <Input type="date" className="rounded-lg" {...register("nextDate")} />
                {errors.nextDate && <p className="text-sm text-destructive">{errors.nextDate.message}</p>}
              </div>

              {frequency === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month (optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    className="rounded-lg"
                    placeholder="e.g. 1"
                    {...register("dayOfMonth", { valueAsNumber: true })}
                  />
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={watch("active") ? "active" : "paused"}
                  onValueChange={(v) => setValue("active", v === "active")}
                >
                  <SelectTrigger className="rounded-lg sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active — generate on schedule</SelectItem>
                    <SelectItem value="paused">Paused — do not generate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg"
                onClick={() => append({ itemName: "", price: 0, quantity: 1 })}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => {
                const lineTotal = calcLineTotal(
                  Number(items[index]?.price) || 0,
                  Number(items[index]?.quantity) || 0
                );
                return (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5">
                      <Label className="text-xs text-muted-foreground">Item Name</Label>
                      <Input
                        className="mt-1 rounded-lg"
                        placeholder="Service or product"
                        {...register(`items.${index}.itemName`)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="mt-1 rounded-lg"
                        {...register(`items.${index}.price`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        className="mt-1 rounded-lg"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2 sm:col-span-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-red-500 hover:bg-red-50"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {errors.items && (
                <p className="text-sm text-destructive">At least one item is required</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[100px] rounded-lg"
                placeholder="Notes to include on generated invoices..."
                {...register("notes")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Schedule Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium capitalize">{frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
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
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Per Invoice</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <RefreshCw className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Schedule"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
