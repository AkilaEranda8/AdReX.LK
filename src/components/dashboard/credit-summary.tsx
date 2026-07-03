"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface CreditSummaryProps {
  totalCreditSales: number;
  totalReceived: number;
  outstandingBalance: number;
}

export function CreditSummaryCard({ totalCreditSales, totalReceived, outstandingBalance }: CreditSummaryProps) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Credit Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Credit Sales</span>
            <span className="font-semibold">{formatCurrency(totalCreditSales)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Received</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(totalReceived)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Outstanding Balance</span>
            <span className="font-semibold text-red-500">{formatCurrency(outstandingBalance)}</span>
          </div>
        </div>
        <Link href="/credits" prefetch={false} className="block">
          <Button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
            View All Credit Clients
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
