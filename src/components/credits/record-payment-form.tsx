"use client";

import { UseFormReturn } from "react-hook-form";
import {
  ArrowLeft,
  DollarSign,
  Wallet,
  FileText,
  ChevronDown,
  CreditCard,
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

export interface PaymentFormData {
  invoiceId: string;
  amount: number;
  note: string;
  paymentMethod: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  remainingBalance: number;
}

interface RecordPaymentFormProps {
  form: UseFormReturn<PaymentFormData>;
  clientName: string;
  clientId: string;
  outstandingBalance: number;
  invoices: Invoice[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RecordPaymentForm({
  form,
  clientName,
  clientId,
  outstandingBalance,
  invoices,
  onSubmit,
  onCancel,
  isSubmitting,
}: RecordPaymentFormProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const amount = watch("amount") || 0;
  const invoiceId = watch("invoiceId");
  const remainingAfter = Math.max(0, outstandingBalance - amount);

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);

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
            <h1 className="text-2xl font-bold text-foreground">Record Payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Record a payment for {clientName} ({clientId})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isSubmitting ? "Recording..." : "Record Payment"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Client</Label>
                <Input value={`${clientName} (${clientId})`} disabled className="rounded-lg bg-muted" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Apply to Invoice (Optional)</Label>
                <Select
                  value={invoiceId || "all"}
                  onValueChange={(v) => setValue("invoiceId", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Apply to all unpaid invoices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Apply to all unpaid invoices (oldest first)</SelectItem>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Balance: {formatCurrency(inv.remainingBalance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInvoice && (
                  <p className="text-xs text-muted-foreground">
                    Invoice balance: {formatCurrency(selectedInvoice.remainingBalance)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Payment Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-lg"
                  {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={watch("paymentMethod")}
                  onValueChange={(v) => setValue("paymentMethod", v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Note (Optional)</Label>
                <Textarea
                  placeholder="Payment reference, cheque number, etc."
                  className="min-h-[80px] resize-none rounded-lg"
                  {...register("note")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-slate-500" />
                Unpaid Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unpaid invoices</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-indigo-600">{inv.invoiceNumber}</p>
                      </div>
                      <p className="font-semibold text-red-500">{formatCurrency(inv.remainingBalance)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Outstanding</span>
                <span className="font-semibold text-red-500">{formatCurrency(outstandingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Amount</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Remaining After</span>
                <span className="text-lg font-bold text-indigo-600">{formatCurrency(remainingAfter)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/10 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-amber-500 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Outstanding Balance</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(outstandingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 rounded-lg"
                onClick={() => setValue("amount", outstandingBalance)}
              >
                <CreditCard className="h-4 w-4" />
                Pay Full Balance
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <DollarSign className="h-4 w-4" />
                {isSubmitting ? "Recording..." : "Confirm Payment"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
