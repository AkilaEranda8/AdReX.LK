"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  INVOICE_WORKFLOW_OPTIONS,
  INVOICE_WORKFLOW_LABELS,
  PAYMENT_STATUS_LABELS,
  type InvoiceWorkflowStatus,
  type PaymentStatusValue,
} from "@/lib/invoice-status";
import { cn } from "@/lib/utils";

interface InvoiceStatusControlProps {
  invoiceStatus: string;
  onChange: (status: InvoiceWorkflowStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function InvoiceStatusControl({
  invoiceStatus,
  onChange,
  disabled,
  compact,
}: InvoiceStatusControlProps) {
  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {!compact && <Label className="text-sm font-medium">Update Invoice Status</Label>}
      <Select
        value={invoiceStatus}
        onValueChange={(v) => onChange(v as InvoiceWorkflowStatus)}
        disabled={disabled}
      >
        <SelectTrigger className={cn("rounded-lg", compact ? "h-9" : "h-10")}>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {INVOICE_WORKFLOW_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getPaymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status as PaymentStatusValue] || status;
}

export function getInvoiceWorkflowLabel(status: string) {
  return INVOICE_WORKFLOW_LABELS[status as InvoiceWorkflowStatus] || status;
}
