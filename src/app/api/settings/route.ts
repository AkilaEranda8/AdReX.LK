import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getCompanySettings, saveCompanySettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { isEmailConfigured, SMTP_PASS_MASK } from "@/lib/email";
import { isSmsConfigured, SMS_API_KEY_MASK } from "@/lib/sms";

function maskSmtpSettings(settings: Awaited<ReturnType<typeof getCompanySettings>>) {
  const smtp = settings.smtp;
  return {
    ...settings,
    smtp: smtp
      ? {
          host: smtp.host || "",
          port: smtp.port || 587,
          user: smtp.user || "",
          pass: smtp.pass ? SMTP_PASS_MASK : "",
          from: smtp.from || "",
          secure: smtp.secure || false,
        }
      : {
          host: "",
          port: 587,
          user: "",
          pass: "",
          from: "",
          secure: false,
        },
    emailConfigured: false as boolean,
  };
}

function maskSmsSettings(settings: Awaited<ReturnType<typeof getCompanySettings>>) {
  const sms = settings.sms;
  return {
    enabled: sms?.enabled !== false,
    provider: sms?.provider || "textit",
    apiUrl: sms?.apiUrl || "",
    apiKey: sms?.apiKey || "",
    apiSecret: sms?.apiSecret ? SMS_API_KEY_MASK : "",
    senderId: sms?.senderId || "",
    sendOnInvoiceCreate: sms?.sendOnInvoiceCreate !== false,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const settings = await getCompanySettings();
  const masked = maskSmtpSettings(settings);
  masked.emailConfigured = await isEmailConfigured();

  return NextResponse.json({
    ...masked,
    sms: maskSmsSettings(settings),
    smsTemplates: settings.smsTemplates,
    smsConfigured: await isSmsConfigured(),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const existing = await getCompanySettings();

    let smtp = existing.smtp;
    if (body.smtp) {
      const incoming = body.smtp;
      smtp = {
        host: incoming.host?.trim() || "",
        port: Number(incoming.port) || 587,
        user: incoming.user?.trim() || "",
        pass:
          incoming.pass && incoming.pass !== SMTP_PASS_MASK
            ? incoming.pass
            : existing.smtp?.pass || "",
        from: incoming.from?.trim() || "",
        secure: !!incoming.secure,
      };
    }

    let sms = existing.sms;
    if (body.sms) {
      const incoming = body.sms;
      sms = {
        enabled: incoming.enabled !== false,
        provider: incoming.provider || "textit",
        apiUrl: incoming.apiUrl?.trim() || "",
        apiKey: incoming.apiKey?.trim() || "",
        apiSecret:
          incoming.apiSecret && incoming.apiSecret !== SMS_API_KEY_MASK
            ? incoming.apiSecret
            : existing.sms?.apiSecret || "",
        senderId: incoming.senderId?.trim() || "",
        sendOnInvoiceCreate: incoming.sendOnInvoiceCreate !== false,
      };
    }

    let smsTemplates = existing.smsTemplates;
    if (body.smsTemplates) {
      smsTemplates = { ...existing.smsTemplates, ...body.smsTemplates };
    }

    await saveCompanySettings({
      ...existing,
      ...body,
      banks: body.banks?.length ? body.banks : existing.banks,
      smtp,
      sms,
      smsTemplates,
    });
    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE",
      entityType: "Settings",
      details: "Company settings updated",
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
