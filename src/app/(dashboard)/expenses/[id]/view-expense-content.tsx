"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Receipt, Building2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface ExpenseDetail {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  paymentMethod: string | null;
  reference: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  notes: string | null;
  createdAt: string;
}

export default function ViewExpenseContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/expenses/${id}`)
      .then((res) => setExpense(res.data))
      .catch(() => {
        toast.error("Expense not found");
        router.push("/expenses");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <PageLoader />;
  if (!expense) return null;

  const statusLabel = { PAID: "Paid", PENDING: "Pending", CANCELLED: "Cancelled" }[expense.status];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="mt-0.5 h-9 w-9 shrink-0 rounded-lg" asChild>
            <Link href="/expenses" prefetch={false}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{expense.expenseNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{expense.description}</p>
          </div>
        </div>
        <Button asChild className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Link href={`/expenses/${id}/edit`} prefetch={false}>
            <Pencil className="h-4 w-4" />
            Edit Expense
          </Link>
        </Button>
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
              <div>
                <p className="text-xs font-medium text-muted-foreground">Date</p>
                <p className="mt-1 font-medium">{formatDate(expense.expenseDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                <p className="mt-1 font-medium">{expense.category}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Vendor / Payee</p>
                <p className="mt-1 font-medium">{expense.vendor || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
                <p className="mt-1 font-medium">{expense.paymentMethod || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reference</p>
                <p className="mt-1 font-medium">{expense.reference || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
                    expense.status === "PAID" && "bg-emerald-100 text-emerald-700",
                    expense.status === "PENDING" && "bg-amber-100 text-amber-700",
                    expense.status === "CANCELLED" && "bg-slate-100 text-slate-600"
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              {expense.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{expense.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-red-100 bg-red-50/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <Tag className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(expense.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{expense.vendor || "No vendor specified"}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Recorded</span>
                <span className="font-medium">{formatDate(expense.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
