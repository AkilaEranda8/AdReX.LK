"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateExpenseForm, type ExpenseFormData } from "@/components/expenses/create-expense-form";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import api from "@/lib/api";
import toast from "react-hot-toast";

const schema = z.object({
  expenseDate: z.string().min(1, "Date is required"),
  category: z.enum(EXPENSE_CATEGORIES as unknown as [string, ...string[]]),
  vendor: z.string(),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.string(),
  reference: z.string(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  notes: z.string(),
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewExpensePage() {
  const router = useRouter();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseDate: todayStr(),
      category: "Other",
      vendor: "",
      description: "",
      amount: 0,
      paymentMethod: "Cash",
      reference: "",
      status: "PAID",
      notes: "",
    },
  });

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      await api.post("/expenses", data);
      toast.success("Expense recorded successfully");
      router.push("/expenses");
    } catch {
      toast.error("Failed to save expense");
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <CreateExpenseForm
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/expenses")}
        isSubmitting={form.formState.isSubmitting}
      />
    </div>
  );
}
