import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  getCreditDiffForWorkflowChange,
  resolveManualInvoiceWorkflow,
  type InvoiceWorkflowStatus,
} from "@/lib/invoice-status";

const VALID: InvoiceWorkflowStatus[] = ["DRAFT", "PENDING", "COMPLETED", "CANCELLED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const invoiceStatus = (body.invoiceStatus || body.status) as InvoiceWorkflowStatus;

    if (!VALID.includes(invoiceStatus)) {
      return NextResponse.json({ error: "Invalid invoice status" }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const paymentsSum = await prisma.payment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });
    const paidTotal = paymentsSum._sum.amount || 0;

    const resolved = resolveManualInvoiceWorkflow(
      invoiceStatus,
      {
        grandTotal: existing.grandTotal,
        advancePayment: existing.advancePayment,
        remainingBalance: existing.remainingBalance,
        invoiceStatus: existing.invoiceStatus,
      },
      paidTotal
    );

    const creditDiff = getCreditDiffForWorkflowChange(
      existing,
      resolved.remainingBalance,
      invoiceStatus
    );

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          invoiceStatus: resolved.invoiceStatus,
          paymentStatus: resolved.paymentStatus,
          remainingBalance: resolved.remainingBalance,
        },
        include: { client: true, items: true, payments: true },
      });

      if (creditDiff !== 0) {
        await tx.client.update({
          where: { id: existing.clientId },
          data: { creditBalance: { increment: creditDiff } },
        });
      }

      return inv;
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE_STATUS",
      entityType: "Invoice",
      entityId: id,
      details: `${invoice.invoiceNumber} → ${invoiceStatus}`,
    });

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
