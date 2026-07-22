"use client";

import { UseFormReturn } from "react-hook-form";
import { ArrowLeft, Receipt, Building2, Tag, ChevronDown } from "lucide-react";
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
import {
  EXPENSE_PAYMENT_METHODS,
  GROWTH_EXPENSE_CATEGORIES,
  OPERATIONAL_EXPENSE_CATEGORIES,
  resolveExpenseKind,
  type ExpenseKind,
} from "@/lib/expense-categories";

export interface ExpenseFormData {
  expenseDate: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  expenseKind: ExpenseKind;
  notes: string;
}

interface CreateExpenseFormProps {
  form: UseFormReturn<ExpenseFormData>;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  expenseNumber?: string;
}

export function CreateExpenseForm({
  form,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = "create",
  expenseNumber,
}: CreateExpenseFormProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  const category = watch("category");
  const vendor = watch("vendor");
  const description = watch("description");
  const amount = watch("amount");
  const status = watch("status");
  const paymentMethod = watch("paymentMethod");
  const expenseKind = watch("expenseKind") || "OPERATIONAL";
  const categories =
    expenseKind === "GROWTH" ? GROWTH_EXPENSE_CATEGORIES : OPERATIONAL_EXPENSE_CATEGORIES;

  const filledFields = [category, description, amount > 0].filter(Boolean).length;

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
              {mode === "edit" ? "Edit Expense" : "Record Expense"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "edit"
                ? expenseNumber
                  ? `Update ${expenseNumber}`
                  : "Update expense details"
                : "Track business expenses and outgoing payments"}
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
            {isSubmitting ? "Saving..." : mode === "edit" ? "Update Expense" : "Save Expense"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {mode === "edit" && expenseNumber && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Expense Number</Label>
                  <Input value={expenseNumber} disabled className="rounded-lg bg-slate-50 font-medium text-indigo-600" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expenseDate">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input id="expenseDate" type="date" className="rounded-lg" {...register("expenseDate")} />
              </div>

              <div className="space-y-2">
                <Label>
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={expenseKind}
                  onValueChange={(v) => {
                    const kind = v as ExpenseKind;
                    setValue("expenseKind", kind);
                    const nextCats =
                      kind === "GROWTH" ? GROWTH_EXPENSE_CATEGORIES : OPERATIONAL_EXPENSE_CATEGORIES;
                    if (!(nextCats as readonly string[]).includes(category)) {
                      setValue("category", nextCats[0]);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">Operational (reduces profit)</SelectItem>
                    <SelectItem value="GROWTH">Growth (from savings only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setValue("category", v);
                    setValue("expenseKind", resolveExpenseKind(v, expenseKind));
                  }}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor / Payee</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="vendor"
                    placeholder="Company or person paid"
                    className="rounded-lg pl-10"
                    {...register("vendor")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount (Rs.) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="rounded-lg"
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="What was this expense for?"
                  className="rounded-lg"
                  {...register("description")}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod || "Cash"} onValueChange={(v) => setValue("paymentMethod", v)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference / Receipt #</Label>
                <Input id="reference" placeholder="Invoice or receipt number" className="rounded-lg" {...register("reference")} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setValue("status", v as ExpenseFormData["status"])}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Additional notes (optional)..."
                className="min-h-[100px] resize-none rounded-lg"
                {...register("notes")}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Tag className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{description || "Expense description"}</p>
                    <p className="truncate text-xs text-muted-foreground">{category || "Category"}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-red-500">{formatCurrency(amount || 0)}</span>
                  </div>
                  {vendor && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor</span>
                      <span className="font-medium">{vendor}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        status === "PAID" && "bg-emerald-100 text-emerald-700",
                        status === "PENDING" && "bg-amber-100 text-amber-700",
                        status === "CANCELLED" && "bg-slate-100 text-slate-600"
                      )}
                    >
                      {status === "PAID" ? "Paid" : status === "PENDING" ? "Pending" : "Cancelled"}
                    </span>
                  </div>
                </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
