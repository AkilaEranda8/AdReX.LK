import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  resolveManualInvoiceWorkflow,
  type InvoiceWorkflowStatus,
} from "@/lib/invoice-status";
import {
  getInvoiceCashApplied,
  money,
  syncClientCreditBalance,
} from "@/lib/accounts";

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

    const cash = await getInvoiceCashApplied(existing);
    const paidTotal = cash.paymentsSum;

    const resolved = resolveManualInvoiceWorkflow(
      invoiceStatus,
      {
        grandTotal: existing.grandTotal,
        advancePayment: existing.advancePayment,
        remainingBalance: existing.remainingBalance,
        invoiceStatus: existing.invoiceStatus,
      },
      // When advance is already a Payment row, don't subtract advance again
      cash.legacyAdvance > 0 ? paidTotal : money(paidTotal)
    );

    // Prefer cash-applied remaining for non-draft/cancel
    let remainingBalance = resolved.remainingBalance;
    if (invoiceStatus !== "DRAFT" && invoiceStatus !== "CANCELLED") {
      remainingBalance = Math.max(0, money(existing.grandTotal - cash.cashApplied));
      if (invoiceStatus === "COMPLETED" && remainingBalance > 0) {
        // Completing with balance still open — keep computed remaining
      }
    }

    const paymentStatus =
      invoiceStatus === "DRAFT" || invoiceStatus === "CANCELLED"
        ? resolved.paymentStatus
        : remainingBalance <= 0
          ? "PAID"
          : remainingBalance < existing.grandTotal
            ? "PARTIALLY_PAID"
            : "UNPAID";

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          invoiceStatus: resolved.invoiceStatus,
          paymentStatus,
          remainingBalance:
            invoiceStatus === "DRAFT" || invoiceStatus === "CANCELLED" ? 0 : remainingBalance,
        },
        include: { client: true, items: true, payments: true },
      });

      await syncClientCreditBalance(existing.clientId, tx);
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
