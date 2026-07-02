import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendSms } from "@/lib/sms";
import { logAudit } from "@/lib/audit";
import { appBranding } from "@/lib/company";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const to = body.to?.trim();
    const message =
      body.message?.trim() ||
      `This is a test SMS from ${appBranding.name}. Your SMS gateway is configured correctly.`;

    if (!to) {
      return NextResponse.json({ sent: false, message: "Phone number is required" }, { status: 400 });
    }

    const result = await sendSms(to, message);

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "SMS_TEST_SENT" : "SMS_TEST_FAILED",
      entityType: "Settings",
      details: result.message,
    });

    return NextResponse.json(result, { status: result.sent ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Failed to send test SMS" }, { status: 500 });
  }
}
