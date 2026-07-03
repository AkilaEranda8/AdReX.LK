import { prisma } from "./prisma";
import { companyInfo } from "./company";

export type SmsProvider = "textit" | "notifylk" | "smslenz" | "generic";

export interface SmsAutoNotifications {
  invoiceSent: boolean;
  quotationSent: boolean;
  paymentReceived: boolean;
}

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

export interface SmsTemplates {
  invoiceSent: string;
  invoiceReminder: string;
  paymentReceived: string;
  quotationSent: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

export interface SettingsData {
  brand: string;
  name: string;
  tagline: string;
  website: string;
  phones: string[];
  emails: string[];
  banks: { name: string; accountNo: string; branch: string; accountName: string }[];
  remarks: string;
  smtp?: SmtpSettings;
  sms?: SmsGatewaySettings;
  smsTemplates?: SmsTemplates;
}

const defaults: SettingsData = {
  brand: companyInfo.brand,
  name: companyInfo.name,
  tagline: companyInfo.tagline,
  website: companyInfo.website,
  phones: [...companyInfo.phones],
  emails: [...companyInfo.emails],
  banks: companyInfo.banks.map((b) => ({ ...b })),
  remarks: companyInfo.remarks,
  sms: {
    enabled: true,
    provider: "textit",
    apiUrl: "",
    apiKey: "",
    apiSecret: "",
    senderId: "",
    autoNotifications: {
      invoiceSent: true,
      quotationSent: true,
      paymentReceived: true,
    },
  },
  smsTemplates: {
    invoiceSent:
      "Dear {{clientName}}, invoice {{invoiceNumber}} for {{amount}} from {{company}} is ready. Thank you!",
    invoiceReminder:
      "Reminder: Invoice {{invoiceNumber}} balance {{balance}} due {{dueDate}}. - {{company}}",
    paymentReceived:
      "Thank you {{clientName}}! Payment {{amount}} received for {{invoiceNumber}}. Remaining balance: {{balance}}. - {{company}}",
    quotationSent:
      "Dear {{clientName}}, quotation {{quotationNumber}} for {{amount}} from {{company}}. Contact us to proceed.",
  },
};

let paymentTemplateMigrated = false;

export async function getCompanySettings(): Promise<SettingsData> {
  const row = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (!row) return defaults;
  try {
    const data = { ...defaults, ...JSON.parse(row.data) } as SettingsData;
    const paymentTemplate = data.smsTemplates?.paymentReceived;
    if (
      !paymentTemplateMigrated &&
      paymentTemplate &&
      !paymentTemplate.includes("{{balance}}")
    ) {
      paymentTemplateMigrated = true;
      data.smsTemplates = {
        ...defaults.smsTemplates!,
        ...data.smsTemplates,
        paymentReceived: defaults.smsTemplates!.paymentReceived,
      };
      await saveCompanySettings(data);
    }
    return data;
  } catch {
    return defaults;
  }
}

export async function saveCompanySettings(data: SettingsData) {
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: { data: JSON.stringify(data) },
    create: { id: "default", data: JSON.stringify(data) },
  });
}
