import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendPaymentReceivedSms } from "@/lib/sms";
import { money, recordCustomerPayment, syncClientCreditBalance } from "@/lib/accounts";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { creditBalance: { gt: 0 } },
        { invoices: { some: { remainingBalance: { gt: 0 }, invoiceStatus: { notIn: ["DRAFT", "CANCELLED"] } } } },
      ],
    },
    include: {
      invoices: {
        where: {
          remainingBalance: { gt: 0 },
          invoiceStatus: { notIn: ["DRAFT", "CANCELLED"] },
        },
        orderBy: { invoiceDate: "asc" },
      },
      payments: { orderBy: { paymentDate: "desc" }, take: 10 },
    },
    orderBy: { name: "asc" },
  });

  // Keep denormalized AR in sync when listing receivables
  for (const client of clients) {
    const outstanding = money(
      client.invoices.reduce((sum, inv) => sum + inv.remainingBalance, 0)
    );
    if (money(client.creditBalance) !== outstanding) {
      await syncClientCreditBalance(client.id);
      client.creditBalance = outstanding;
    }
  }

  const credits = clients.map((client) => {
    const outstanding = money(client.creditBalance);
    const openInvoiced = money(client.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0));
    const paidOnOpen = money(openInvoiced - outstanding);

    return {
      ...client,
      totalCredit: openInvoiced,
      paidAmount: Math.max(0, paidOnOpen),
      outstandingBalance: outstanding,
    };
  });

  return NextResponse.json(credits);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { clientId, invoiceId, note } = body;
    const amount = money(body.amount);

    if (!clientId || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      return recordCustomerPayment({
        tx,
        clientId,
        amount,
        invoiceId: invoiceId || null,
        paymentMethod: body.paymentMethod || null,
        note: note || null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      });
    });

    const primary = result.payments[0];
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, contactNumber: true, creditBalance: true },
    });

    let invoiceNumber = "your account";
    let balance = client?.creditBalance ?? 0;

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true, remainingBalance: true },
      });
      if (invoice?.invoiceNumber) invoiceNumber = `invoice ${invoice.invoiceNumber}`;
      if (invoice) balance = invoice.remainingBalance;
    }

    let sms: Awaited<ReturnType<typeof sendPaymentReceivedSms>> | undefined;
    if (client) {
      sms = await sendPaymentReceivedSms({
        client,
        amount,
        invoiceNumber,
        balance,
      });
      if (sms.sent || (!sms.skipped && !sms.sent)) {
        await logAudit({
          userId: auth.session.userId,
          userName: auth.session.name,
          action: sms.sent ? "SMS_SENT" : "SMS_FAILED",
          entityType: "Payment",
          entityId: primary?.id,
          details: sms.message,
        });
      }
    }

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "CREATE",
      entityType: "Payment",
      entityId: primary?.id,
      details: `Rs. ${amount}${result.payments.length > 1 ? ` · split across ${result.payments.length} invoices` : ""}`,
    });

    return NextResponse.json(
      {
        id: primary?.id,
        amount,
        payments: result.payments,
        outstanding: result.outstanding,
        sms,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
