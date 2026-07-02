import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { appBranding } from "@/lib/company";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const to = body.to?.trim() || auth.session.email;

    const result = await sendEmail({
      to,
      subject: `${appBranding.name} — Test Email`,
      text: `This is a test email from ${appBranding.name}. SMTP is configured correctly.`,
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "EMAIL_TEST_SENT" : "EMAIL_TEST_FAILED",
      entityType: "Settings",
      details: result.message,
    });

    return NextResponse.json(result, { status: result.sent ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
