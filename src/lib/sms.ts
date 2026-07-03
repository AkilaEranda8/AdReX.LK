import { getCompanySettings, type SmsAutoNotifications } from "./settings";
import { companyInfo } from "./company";
import { formatCurrency, formatDate } from "./utils";

export type SmsProvider = "textit" | "notifylk" | "smslenz" | "generic";

export interface SmsGatewaySettings {
  enabled: boolean;
  provider: SmsProvider;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  senderId: string;
  /** @deprecated use autoNotifications.invoiceSent */
  sendOnInvoiceCreate?: boolean;
  autoNotifications?: Partial<SmsAutoNotifications>;
}

export type SmsAutoTrigger = keyof SmsAutoNotifications;

export const defaultSmsAutoNotifications: SmsAutoNotifications = {
  invoiceSent: true,
  quotationSent: true,
  paymentReceived: true,
};

export const SMS_AUTO_TRIGGER_META: Record<
  SmsAutoTrigger,
  { label: string; description: string }
> = {
  invoiceSent: {
    label: "New Invoice",
    description:
      "Invoice create, draft publish, quotation convert, or recurring invoice generate",
  },
  quotationSent: {
    label: "New Quotation",
    description: "Quotation create or draft publish",
  },
  paymentReceived: {
    label: "Payment Received",
    description:
      "Payment recorded from Credits, or advance payment added on an invoice",
  },
};

export interface SmsTemplates {
  invoiceSent: string;
  invoiceReminder: string;
  paymentReceived: string;
  quotationSent: string;
}

export const SMS_TEMPLATE_LABELS: Record<keyof SmsTemplates, string> = {
  invoiceSent: "New Invoice",
  invoiceReminder: "Payment Reminder",
  paymentReceived: "Payment Received",
  quotationSent: "Quotation Sent",
};

export const SMS_TEMPLATE_PLACEHOLDERS =
  "{{clientName}}, {{invoiceNumber}}, {{quotationNumber}}, {{amount}}, {{balance}}, {{dueDate}}, {{company}}";

export const defaultSmsTemplates: SmsTemplates = {
  invoiceSent:
    "Dear {{clientName}}, invoice {{invoiceNumber}} for {{amount}} from {{company}} is ready. Thank you!",
  invoiceReminder:
    "Reminder: Invoice {{invoiceNumber}} balance {{balance}} due {{dueDate}}. - {{company}}",
  paymentReceived:
    "Thank you {{clientName}}! Payment {{amount}} received for {{invoiceNumber}}. Remaining balance: {{balance}}. - {{company}}",
  quotationSent:
    "Dear {{clientName}}, quotation {{quotationNumber}} for {{amount}} from {{company}}. Contact us to proceed.",
};

export const SMS_API_KEY_MASK = "••••••••";

export function renderSmsTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return `94${digits.slice(1)}`;
  if (digits.length === 9) return `94${digits}`;
  return digits;
}

function sanitizeGatewayError(body: string, status: number) {
  const trimmed = body.trim();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    if (/<title>\s*Not Found\s*<\/title>/i.test(trimmed)) {
      return `SMS API URL not found (HTTP ${status}). Check the gateway URL in Settings → SMS Gateway.`;
    }
    return `SMS gateway returned an HTML error page (HTTP ${status}). Verify the API URL and credentials.`;
  }

  if (trimmed.length > 240) {
    return `${trimmed.slice(0, 240)}...`;
  }

  return trimmed || `SMS gateway failed (HTTP ${status})`;
}

export async function getSmsConfig(): Promise<SmsGatewaySettings | null> {
  const settings = await getCompanySettings();
  const sms = settings.sms;

  const enabled = sms?.enabled !== false;
  const provider = (process.env.SMS_PROVIDER as SmsProvider) || sms?.provider || "textit";
  const apiKey = process.env.SMS_API_KEY?.trim() || sms?.apiKey?.trim() || "";
  const apiSecret = process.env.SMS_API_SECRET || sms?.apiSecret || "";
  const senderId = process.env.SMS_SENDER_ID?.trim() || sms?.senderId?.trim() || "";
  const apiUrl = process.env.SMS_API_URL?.trim() || sms?.apiUrl?.trim() || "";

  if (!enabled || !apiKey) return null;

  if (provider === "textit" && !apiSecret) return null;
  if (provider === "notifylk" && (!apiSecret || !senderId)) return null;
  if (provider === "smslenz" && (!apiSecret || !senderId)) return null;
  if (provider === "generic" && !apiUrl) return null;

  return {
    enabled: true,
    provider,
    apiUrl,
    apiKey,
    apiSecret,
    senderId,
  };
}

export async function isSmsConfigured(): Promise<boolean> {
  return !!(await getSmsConfig());
}

export async function getSmsTemplates(): Promise<SmsTemplates> {
  const settings = await getCompanySettings();
  return { ...defaultSmsTemplates, ...settings.smsTemplates };
}

async function sendViaTextIt(config: SmsGatewaySettings, to: string, message: string) {
  const url = new URL("https://www.textit.biz/sendmsg/");
  url.searchParams.set("id", config.apiKey);
  url.searchParams.set("pw", config.apiSecret);
  url.searchParams.set("to", to);
  url.searchParams.set("text", message);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(sanitizeGatewayError(body, res.status));
  }

  const lower = body.toLowerCase();
  if (lower.includes("error") || lower.includes("invalid") || lower.includes("fail")) {
    throw new Error(body.trim() || "TextIt returned an error");
  }

  return body;
}

async function sendViaNotifyLk(config: SmsGatewaySettings, to: string, message: string) {
  const res = await fetch("https://app.notify.lk/api/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: config.apiKey,
      api_key: config.apiSecret,
      sender_id: config.senderId,
      to,
      message,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { status?: string; message?: string };
  };

  if (!res.ok) {
    throw new Error(data.message || data.data?.message || `Notify.lk failed (${res.status})`);
  }

  const status = data.status || data.data?.status;
  if (status && status !== "success") {
    throw new Error(data.message || data.data?.message || "Notify.lk returned an error");
  }

  return data;
}

function formatSmsLenzContact(phone: string) {
  const digits = normalizePhoneNumber(phone);
  return `+${digits}`;
}

async function sendViaSmsLenz(config: SmsGatewaySettings, to: string, message: string) {
  const res = await fetch("https://smslenz.lk/api/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      user_id: config.apiKey,
      api_key: config.apiSecret,
      sender_id: config.senderId,
      contact: formatSmsLenzContact(to),
      message,
    }),
    cache: "no-store",
  });

  const body = await res.text();
  let data: { success?: boolean; message?: string; data?: { status?: string; message?: string } } = {};

  try {
    data = JSON.parse(body) as typeof data;
  } catch {
    if (!res.ok) {
      throw new Error(sanitizeGatewayError(body, res.status));
    }
  }

  if (!res.ok || data.success === false) {
    throw new Error(
      data.message || data.data?.message || sanitizeGatewayError(body, res.status)
    );
  }

  const status = data.data?.status;
  if (status && status !== "success") {
    throw new Error(data.message || data.data?.message || "SMSlenz returned an error");
  }

  return data;
}

async function sendViaGeneric(config: SmsGatewaySettings, to: string, message: string) {
  const url = config.apiUrl
    .replace(/\{to\}/g, encodeURIComponent(to))
    .replace(/\{message\}/g, encodeURIComponent(message))
    .replace(/\{sender\}/g, encodeURIComponent(config.senderId))
    .replace(/\{apiKey\}/g, encodeURIComponent(config.apiKey));

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const body = await res.text();

  if (!res.ok) {
    throw new Error(sanitizeGatewayError(body, res.status));
  }

  return body;
}

export async function sendSms(
  to: string,
  message: string
): Promise<{ sent: boolean; message: string }> {
  const config = await getSmsConfig();

  if (!config) {
    return {
      sent: false,
      message:
        "SMS gateway not configured. Add SMS settings in Settings → SMS Gateway, or set SMS_API_KEY in .env",
    };
  }

  const phone = normalizePhoneNumber(to);
  if (phone.length < 11) {
    return { sent: false, message: "Invalid phone number" };
  }

  const text = message.trim().slice(0, 621);
  if (!text) {
    return { sent: false, message: "Message is empty" };
  }

  try {
    if (config.provider === "textit") {
      await sendViaTextIt(config, phone, text);
    } else if (config.provider === "notifylk") {
      await sendViaNotifyLk(config, phone, text);
    } else if (config.provider === "smslenz") {
      await sendViaSmsLenz(config, phone, text);
    } else {
      await sendViaGeneric(config, phone, text);
    }

    return { sent: true, message: "SMS sent successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send SMS";
    return { sent: false, message: msg };
  }
}

export type SmsResult = { sent: boolean; message: string; skipped?: boolean };

export async function getSmsAutoNotifications(): Promise<SmsAutoNotifications> {
  const settings = await getCompanySettings();
  const sms = settings.sms;
  const saved = sms?.autoNotifications;

  if (saved) {
    return {
      invoiceSent: saved.invoiceSent !== false,
      quotationSent: saved.quotationSent !== false,
      paymentReceived: saved.paymentReceived !== false,
    };
  }

  return {
    invoiceSent: sms?.sendOnInvoiceCreate !== false,
    quotationSent: true,
    paymentReceived: true,
  };
}

export async function isAutoSmsEnabled(trigger: SmsAutoTrigger): Promise<boolean> {
  const settings = await getCompanySettings();
  if (settings.sms?.enabled === false) return false;
  const notifications = await getSmsAutoNotifications();
  if (!notifications[trigger]) return false;
  return !!(await getSmsConfig());
}

export type InvoiceSmsPayload = {
  client: { name: string; contactNumber: string };
  invoiceNumber: string;
  grandTotal: number;
  remainingBalance: number;
  dueDate: Date | null;
};

export type QuotationSmsPayload = {
  client: { name: string; contactNumber: string };
  quotationNumber: string;
  grandTotal: number;
};

export type PaymentSmsPayload = {
  client: { name: string; contactNumber: string };
  amount: number;
  invoiceNumber: string;
  balance: number;
};

export async function shouldAutoSendInvoiceSms(): Promise<boolean> {
  return isAutoSmsEnabled("invoiceSent");
}

export async function sendQuotationSms(quotation: QuotationSmsPayload): Promise<SmsResult> {
  const phone = quotation.client.contactNumber?.trim();
  if (!phone) {
    return { sent: false, message: "Client has no contact number", skipped: true };
  }

  const settings = await getCompanySettings();
  return sendTemplatedSms(phone, "quotationSent", {
    clientName: quotation.client.name,
    quotationNumber: quotation.quotationNumber,
    amount: formatCurrency(quotation.grandTotal),
    company: settings.brand || settings.name,
  });
}

export async function sendQuotationCreatedSms(quotation: QuotationSmsPayload): Promise<SmsResult> {
  if (!(await isAutoSmsEnabled("quotationSent"))) {
    return {
      sent: false,
      message: "Auto quotation SMS is disabled or gateway not configured",
      skipped: true,
    };
  }

  return sendQuotationSms(quotation);
}

export async function sendPaymentReceivedSms(payment: PaymentSmsPayload): Promise<SmsResult> {
  if (!(await isAutoSmsEnabled("paymentReceived"))) {
    return {
      sent: false,
      message: "Auto payment SMS is disabled or gateway not configured",
      skipped: true,
    };
  }

  const phone = payment.client.contactNumber?.trim();
  if (!phone) {
    return { sent: false, message: "Client has no contact number", skipped: true };
  }

  const settings = await getCompanySettings();
  const templates = await getSmsTemplates();
  const template = templates.paymentReceived || defaultSmsTemplates.paymentReceived;
  const balanceText = formatCurrency(payment.balance);
  const company = settings.brand || settings.name;
  const vars = {
    clientName: payment.client.name,
    invoiceNumber: payment.invoiceNumber,
    amount: formatCurrency(payment.amount),
    balance: balanceText,
    company,
  };

  let text = renderSmsTemplate(template, vars);
  if (!text.includes(balanceText)) {
    const companySuffix = company ? ` - ${company}` : "";
    const base = companySuffix && text.endsWith(companySuffix)
      ? text.slice(0, -companySuffix.length).trimEnd().replace(/\.$/, "")
      : text.trimEnd().replace(/\.$/, "");
    text = `${base}. Remaining balance: ${balanceText}${companySuffix}`;
  }

  return sendSms(phone, text);
}

export async function sendInvoiceAdvancePaymentSms(invoice: {
  client: { name: string; contactNumber: string };
  invoiceNumber: string;
  advancePayment: number;
  remainingBalance: number;
}): Promise<SmsResult | undefined> {
  if (invoice.advancePayment <= 0) return undefined;

  return sendPaymentReceivedSms({
    client: invoice.client,
    amount: invoice.advancePayment,
    invoiceNumber: `invoice ${invoice.invoiceNumber}`,
    balance: invoice.remainingBalance,
  });
}

export async function sendInvoiceSms(
  invoice: InvoiceSmsPayload,
  templateKey: "invoiceSent" | "invoiceReminder" = "invoiceSent"
): Promise<SmsResult> {
  const phone = invoice.client.contactNumber?.trim();
  if (!phone) {
    return { sent: false, message: "Client has no contact number", skipped: true };
  }

  const settings = await getCompanySettings();
  return sendTemplatedSms(phone, templateKey, {
    clientName: invoice.client.name,
    invoiceNumber: invoice.invoiceNumber,
    amount: formatCurrency(invoice.grandTotal),
    balance: formatCurrency(invoice.remainingBalance),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : "—",
    company: settings.brand || settings.name,
  });
}

export async function sendInvoiceCreatedSms(invoice: InvoiceSmsPayload): Promise<SmsResult> {
  if (!(await shouldAutoSendInvoiceSms())) {
    return {
      sent: false,
      message: "Auto invoice SMS is disabled or gateway not configured",
      skipped: true,
    };
  }

  return sendInvoiceSms(invoice, "invoiceSent");
}

export async function sendTemplatedSms(
  to: string,
  templateKey: keyof SmsTemplates,
  vars: Record<string, string>
) {
  const templates = await getSmsTemplates();
  const template = templates[templateKey] || defaultSmsTemplates[templateKey];
  const settings = await getCompanySettings();
  const company = settings.name || companyInfo.name;

  return sendSms(to, renderSmsTemplate(template, { company, ...vars }));
}
