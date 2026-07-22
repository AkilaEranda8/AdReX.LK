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
  expenseKind: z.enum(["OPERATIONAL", "GROWTH"]),
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
      expenseKind: "OPERATIONAL",
      notes: "",
    },
  });

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      const res = await api.post("/expenses", data);
      if (data.expenseKind === "GROWTH") {
        toast.success("Growth expense recorded from company savings");
      } else {
        toast.success("Expense recorded successfully");
      }
      if (res.data?.savingsBalance != null) {
        toast(`Savings balance: Rs. ${Number(res.data.savingsBalance).toFixed(2)}`);
      }
      router.push("/expenses");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to save expense");
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
