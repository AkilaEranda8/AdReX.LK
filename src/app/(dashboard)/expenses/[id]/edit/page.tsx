"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateExpenseForm, type ExpenseFormData } from "@/components/expenses/create-expense-form";
import { PageLoader } from "@/components/ui/loading";
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

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [expenseNumber, setExpenseNumber] = useState("");

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseDate: "",
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

  useEffect(() => {
    api
      .get(`/expenses/${id}`)
      .then((res) => {
        const e = res.data;
        setExpenseNumber(e.expenseNumber);
        form.reset({
          expenseDate: e.expenseDate.slice(0, 10),
          category: e.category,
          vendor: e.vendor || "",
          description: e.description,
          amount: e.amount,
          paymentMethod: e.paymentMethod || "Cash",
          reference: e.reference || "",
          status: e.status,
          notes: e.notes || "",
        });
      })
      .catch(() => toast.error("Failed to load expense"))
      .finally(() => setLoading(false));
  }, [id, form]);

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();

    try {
      await api.put(`/expenses/${id}`, data);
      toast.success("Expense updated successfully");
      router.push("/expenses");
    } catch {
      toast.error("Failed to update expense");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6">
      <CreateExpenseForm
        form={form}
        onSubmit={onSubmit}
        onCancel={() => router.push("/expenses")}
        isSubmitting={form.formState.isSubmitting}
        mode="edit"
        expenseNumber={expenseNumber}
      />
    </div>
  );
}
