"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { DollarSign, Wallet } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  invoiceId: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Client {
  id: string;
  name: string;
  clientId: string;
  outstandingBalance: number;
  invoices: { id: string; invoiceNumber: string; remainingBalance: number }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const invoiceId = watch("invoiceId");

  useEffect(() => {
    if (open) {
      reset({ amount: 0, note: "", invoiceId: "" });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!client) return;
    try {
      await api.post("/credits", {
        clientId: client.id,
        invoiceId: data.invoiceId || undefined,
        amount: data.amount,
        note: data.note,
        paymentMethod: "cash",
      });
      toast.success("Payment recorded successfully");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
            Record Payment
          </DialogTitle>
        </DialogHeader>
        {client && (
          <div className="rounded-xl bg-amber-500/10 p-4 dark:bg-amber-500/10">
            <p className="font-semibold text-foreground">{client.name}</p>
            <p className="text-xs text-muted-foreground">{client.clientId}</p>
            <div className="mt-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span className="text-sm text-muted-foreground">Outstanding:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(client.outstandingBalance)}</span>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice (optional)</Label>
            <Select value={invoiceId || "all"} onValueChange={(v) => setValue("invoiceId", v === "all" ? "" : v)}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Apply to all unpaid invoices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Apply to all unpaid invoices</SelectItem>
                {client?.invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {formatCurrency(inv.remainingBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">
              Payment Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              className="rounded-lg"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            {client && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-indigo-600"
                onClick={() => setValue("amount", client.outstandingBalance)}
              >
                Pay full balance ({formatCurrency(client.outstandingBalance)})
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" placeholder="Reference, cheque number..." className="rounded-lg" {...register("note")} />
          </div>
          {client && (
            <Link href={`/credits/${client.id}/payment`} className="block text-center text-xs text-indigo-600 hover:underline">
              Open full payment form
            </Link>
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
