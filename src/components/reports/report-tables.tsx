"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export interface OverdueRow {
  id: string;
  invoiceNumber: string;
  client: string;
  dueDate: string;
  remainingBalance: number;
}

interface OverdueInvoicesTableProps {
  data: OverdueRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function OverdueInvoicesTable({
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: OverdueInvoicesTableProps) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-slate-900">Overdue Invoices</h3>
        <p className="text-xs text-muted-foreground">Invoices past their due date with outstanding balance</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Balance Due</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No overdue invoices
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-4">
                    <Link href={`/invoices/${row.id}`} className="font-medium text-indigo-600 hover:underline">
                      {row.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900">{row.client}</td>
                  <td className="px-4 py-4 text-red-600">{formatDate(row.dueDate)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-red-600">
                    {formatCurrency(row.remainingBalance)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link href={`/invoices/${row.id}`}>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, total)} of {total}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </div>
      )}
    </div>
  );
}

export interface ClientStatementRow {
  id: string;
  clientId: string;
  name: string;
  creditBalance: number;
}

export function ClientStatementsTable({
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  data: ClientStatementRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-slate-900">Client Outstanding Statement</h3>
        <p className="text-xs text-muted-foreground">Clients with outstanding credit balances</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Client ID</th>
              <th className="px-4 py-3">Client Name</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  No outstanding balances
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-4 text-muted-foreground">{row.clientId}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-4 text-right font-semibold text-amber-600">
                    {formatCurrency(row.creditBalance)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link href={`/credits/${row.id}`}>
                      <Button variant="outline" size="sm" className="rounded-lg">
                        View Credit
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, total)} of {total}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </div>
      )}
    </div>
  );
}

export interface PaymentRow {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  client: { name: string };
  invoice?: { invoiceNumber: string };
}

export function RecentPaymentsTable({
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  data: PaymentRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-slate-900">Recent Payments</h3>
        <p className="text-xs text-muted-foreground">Latest payment transactions recorded in the system</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No payments in selected period
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.paymentDate}-${i}`} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(row.paymentDate)}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{row.client.name}</td>
                  <td className="px-4 py-4 text-indigo-600">{row.invoice?.invoiceNumber || "—"}</td>
                  <td className="px-4 py-4 capitalize text-muted-foreground">{row.paymentMethod || "cash"}</td>
                  <td className="px-4 py-4 text-right font-semibold text-emerald-600">
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, total)} of {total}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </div>
      )}
    </div>
  );
}

export interface ExpenseReportRow {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  status: string;
}

export function RecentExpensesTable({
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  data: ExpenseReportRow[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold text-slate-900">Recent Expenses</h3>
        <p className="text-xs text-muted-foreground">Business expenses recorded in the selected period</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Expense #</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No expenses in selected period
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-4 text-muted-foreground">{formatDate(row.expenseDate)}</td>
                  <td className="px-4 py-4">
                    <Link href={`/expenses/${row.id}`} prefetch={false} className="font-medium text-indigo-600 hover:underline">
                      {row.expenseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{row.category}</td>
                  <td className="px-4 py-4 text-muted-foreground">{row.description}</td>
                  <td className="px-4 py-4 capitalize">{row.status.toLowerCase()}</td>
                  <td className="px-4 py-4 text-right font-semibold text-red-500">
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start + 1} to {Math.min(start + pageSize, total)} of {total}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  pageSize: number;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className={cn("h-8 w-8", "pointer-events-none")}>
          {page}
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
