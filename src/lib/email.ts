import { companyInfo } from "./company";
import { getCompanySettings } from "./settings";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await getCompanySettings();
  const smtp = settings.smtp;

  const host = process.env.SMTP_HOST?.trim() || smtp?.host?.trim();
  const user = process.env.SMTP_USER?.trim() || smtp?.user?.trim();
  const pass = process.env.SMTP_PASS || smtp?.pass;

  if (!host || !user || !pass) return null;

  const fromEmail =
    process.env.SMTP_FROM?.trim() ||
    smtp?.from?.trim() ||
    settings.emails[0] ||
    companyInfo.emails[0];

  return {
    host,
    port: Number(process.env.SMTP_PORT || smtp?.port || 587),
    user,
    pass,
    from: fromEmail,
    secure: process.env.SMTP_SECURE === "true" || smtp?.secure === true,
  };
}

export async function isEmailConfigured(): Promise<boolean> {
  return !!(await getSmtpConfig());
}

export function getEmailConfigSource(): "env" | "settings" | null {
  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS) {
    return "env";
  }
  return null;
}

export async function sendEmail(options: EmailOptions): Promise<{ sent: boolean; message: string }> {
  const config = await getSmtpConfig();

  if (!config) {
    return {
      sent: false,
      message:
        "SMTP not configured. Add SMTP settings in Settings → Email, or set SMTP_HOST, SMTP_USER, SMTP_PASS in .env",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, "<br>"),
    });

    return { sent: true, message: "Email sent successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send email";
    return { sent: false, message: msg };
  }
}

export function buildDocumentEmailBody(type: "invoice" | "quotation", number: string, clientName: string) {
  const label = type === "invoice" ? "Invoice" : "Quotation";
  return `Dear ${clientName},\n\nPlease find your ${label} ${number} from ${companyInfo.name}.\n\nThank you for your business.\n\n${companyInfo.website}`;
}

export const SMTP_PASS_MASK = "••••••••";
