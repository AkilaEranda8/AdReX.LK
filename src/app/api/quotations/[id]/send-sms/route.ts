import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCompanySettings } from "@/lib/settings";
import { sendTemplatedSms } from "@/lib/sms";
import { formatCurrency } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const settings = await getCompanySettings();

    const result = await sendTemplatedSms(quotation.client.contactNumber, "quotationSent", {
      clientName: quotation.client.name,
      quotationNumber: quotation.quotationNumber,
      amount: formatCurrency(quotation.grandTotal),
      company: settings.brand || settings.name,
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "SMS_SENT" : "SMS_FAILED",
      entityType: "Quotation",
      entityId: id,
      details: result.message,
    });

    return NextResponse.json(result, { status: result.sent ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
