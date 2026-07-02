import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanySettings } from "@/lib/settings";
import { sendTemplatedSms } from "@/lib/sms";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const template = (body.template as string) || "invoiceSent";

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const settings = await getCompanySettings();
    const templateKey =
      template === "invoiceReminder" ? "invoiceReminder" : "invoiceSent";

    const result = await sendTemplatedSms(invoice.client.contactNumber, templateKey, {
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.grandTotal),
      balance: formatCurrency(invoice.remainingBalance),
      dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "—",
      company: settings.brand || settings.name,
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "SMS_SENT" : "SMS_FAILED",
      entityType: "Invoice",
      entityId: id,
      details: result.message,
    });

    return NextResponse.json(result, { status: result.sent ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
