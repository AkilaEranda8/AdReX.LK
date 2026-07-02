import api from "@/lib/api";
import { companyInfo } from "@/lib/company";
import type { SettingsData } from "@/lib/settings";

export type PdfCompanyInfo = typeof companyInfo;

export function settingsToCompanyInfo(settings: SettingsData): PdfCompanyInfo {
  return {
    name: settings.name,
    brand: settings.brand,
    tagline: settings.tagline,
    website: settings.website,
    phones: settings.phones,
    emails: settings.emails,
    banks: settings.banks,
    remarks: settings.remarks,
    copyright: `Copyright © ${new Date().getFullYear()} ${settings.name}. All Rights Reserved.`,
  };
}

export async function fetchCompanyForPdf(): Promise<PdfCompanyInfo> {
  try {
    const res = await api.get<SettingsData>("/settings");
    return settingsToCompanyInfo(res.data);
  } catch {
    return companyInfo;
  }
}
