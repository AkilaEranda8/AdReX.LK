"use client";

import { Building2, Mail, Phone, Landmark, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsStatCardsProps {
  emailConfigured: boolean;
  smsConfigured: boolean;
  brand: string;
  phoneCount: number;
  emailCount: number;
  bankCount: number;
}

export function SettingsStatCards({
  emailConfigured,
  smsConfigured,
  brand,
  phoneCount,
  emailCount,
  bankCount,
}: SettingsStatCardsProps) {
  const cards = [
    {
      key: "email",
      label: "Email (SMTP)",
      value: emailConfigured ? "Configured" : "Not set",
      sub: emailConfigured ? "Ready to send" : "Configure below",
      icon: Mail,
      iconBg: emailConfigured ? "bg-emerald-50" : "bg-amber-50",
      iconColor: emailConfigured ? "text-emerald-600" : "text-amber-600",
      valueColor: emailConfigured ? "text-emerald-700" : "text-amber-700",
    },
    {
      key: "sms",
      label: "SMS Gateway",
      value: smsConfigured ? "Connected" : "Not set",
      sub: smsConfigured ? "Ready to send" : "Configure below",
      icon: MessageSquare,
      iconBg: smsConfigured ? "bg-emerald-50" : "bg-amber-50",
      iconColor: smsConfigured ? "text-emerald-600" : "text-amber-600",
      valueColor: smsConfigured ? "text-emerald-700" : "text-amber-700",
    },
    {
      key: "brand",
      label: "Company Brand",
      value: brand || "—",
      sub: "Shown on documents",
      icon: Building2,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-slate-900",
    },
    {
      key: "contact",
      label: "Contact Channels",
      value: `${phoneCount} phones · ${emailCount} emails`,
      sub: "On invoices & PDFs",
      icon: Phone,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      key: "banks",
      label: "Bank Accounts",
      value: String(bankCount),
      sub: bankCount === 1 ? "Account on file" : "Accounts on file",
      icon: Landmark,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      valueColor: "text-slate-900",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="border-slate-200/80 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", card.iconBg)}>
                <Icon className={cn("h-6 w-6", card.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className={cn("truncate text-lg font-bold", card.valueColor)}>{card.value}</p>
                <p className="text-[11px] text-muted-foreground">{card.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
