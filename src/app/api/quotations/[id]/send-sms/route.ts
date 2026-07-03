import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendQuotationSms } from "@/lib/sms";

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

    const result = await sendQuotationSms(quotation);

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
