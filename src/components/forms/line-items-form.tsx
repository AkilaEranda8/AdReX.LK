"use client";

import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
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

export interface LineItem {
  itemName: string;
  price: number;
  quantity: number;
}

export interface DocumentFormData {
  clientId: string;
  date: string;
  items: LineItem[];
  discount?: number;
  advancePayment?: number;
}

interface Client {
  id: string;
  clientId: string;
  name: string;
}

interface LineItemsFormProps {
  form: UseFormReturn<DocumentFormData>;
  clients: Client[];
  showDiscount?: boolean;
  showAdvance?: boolean;
}

export function calculateLineTotal(price: number, quantity: number) {
  return Math.round(price * quantity * 100) / 100;
}

export function LineItemsForm({ form, clients, showDiscount, showAdvance }: LineItemsFormProps) {
  const { register, control, watch, setValue, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items") || [];
  const discount = watch("discount") || 0;
  const advancePayment = watch("advancePayment") || 0;

  const subTotal = items.reduce(
    (sum, item) => sum + calculateLineTotal(Number(item.price) || 0, Number(item.quantity) || 0),
    0
  );
  const grandTotal = Math.round((subTotal - discount) * 100) / 100;
  const remainingBalance = Math.round((grandTotal - advancePayment) * 100) / 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={watch("clientId")} onValueChange={(v) => setValue("clientId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.clientId})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientId && <p className="text-sm text-destructive">Client is required</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ itemName: "", price: 0, quantity: 1 })}
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const price = Number(watch(`items.${index}.price`)) || 0;
            const qty = Number(watch(`items.${index}.quantity`)) || 0;
            const total = calculateLineTotal(price, qty);
            return (
              <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Input placeholder="Item name" {...register(`items.${index}.itemName`)} />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    {...register(`items.${index}.price`, { valueAsNumber: true })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    step="1"
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="flex items-center sm:col-span-3">
                  <span className="text-sm font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center sm:col-span-1">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sub Total</span>
          <span className="font-medium">{formatCurrency(subTotal)}</span>
        </div>
        {showDiscount && (
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Discount</Label>
            <Input
              type="number"
              step="0.01"
              className="w-32"
              {...register("discount", { valueAsNumber: true })}
            />
          </div>
        )}
        {showAdvance && (
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Advance Payment</Label>
            <Input
              type="number"
              step="0.01"
              className="w-32"
              {...register("advancePayment", { valueAsNumber: true })}
            />
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
        {showAdvance && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Remaining Balance</span>
            <span className="font-medium">{formatCurrency(remainingBalance)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
