"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SMS_TEMPLATE_LABELS,
  SMS_TEMPLATE_PLACEHOLDERS,
  SMS_AUTO_TRIGGER_META,
  type SmsAutoTrigger,
  type SmsTemplates,
} from "@/lib/sms";
import type { SmsProvider, SmsAutoNotifications } from "@/lib/settings";
import { CheckCircle2, AlertCircle, MessageSquare, Send } from "lucide-react";

export type SmsForm = {
  enabled: boolean;
  provider: SmsProvider;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  senderId: string;
  autoNotifications: SmsAutoNotifications;
};

interface SmsSettingsCardProps {
  sms: SmsForm;
  smsTemplates: SmsTemplates;
  smsConfigured: boolean;
  testPhone: string;
  testingSms: boolean;
  onSmsChange: (sms: SmsForm) => void;
  onTemplateChange: (key: keyof SmsTemplates, value: string) => void;
  onTestPhoneChange: (value: string) => void;
  onTestSms: () => void;
}

const providerHelp: Record<SmsProvider, string> = {
  textit: "TextIt.biz — API Key = User ID, API Secret = Password",
  notifylk: "Notify.lk — API Key = User ID, API Secret = API Key, Sender ID required",
  smslenz: "SMSlenz.lk — User ID + API Key from dashboard. Use SMSlenzDEMO as Sender ID for testing.",
  generic: "Custom URL with {to}, {message}, {sender}, {apiKey} placeholders",
};

export function SmsSettingsCard({
  sms,
  smsTemplates,
  smsConfigured,
  testPhone,
  testingSms,
  onSmsChange,
  onTemplateChange,
  onTestPhoneChange,
  onTestSms,
}: SmsSettingsCardProps) {
  return (
    <>
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            SMS Gateway
          </CardTitle>
          {smsConfigured ? (
            <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Not configured
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect TextIt, Notify.lk, or a custom HTTP SMS API. Env vars{" "}
            <code className="rounded bg-muted px-1 text-xs">SMS_API_KEY</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">SMS_API_SECRET</code> override saved settings.
          </p>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={sms.enabled}
              onChange={(e) => onSmsChange({ ...sms, enabled: e.target.checked })}
            />
            Enable SMS gateway
          </label>

          <div className="space-y-3 rounded-xl border border-slate-200/80 bg-muted/30 p-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium">Automatic SMS notifications</p>
              <p className="text-xs text-muted-foreground">
                Choose which events automatically send SMS to clients. Manual sends (e.g. Payment
                Reminder from invoice page) are always available when the gateway is connected.
              </p>
            </div>
            {(Object.keys(SMS_AUTO_TRIGGER_META) as SmsAutoTrigger[]).map((key) => (
              <label key={key} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={sms.autoNotifications[key]}
                  onChange={(e) =>
                    onSmsChange({
                      ...sms,
                      autoNotifications: {
                        ...sms.autoNotifications,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                <span>
                  <span className="font-medium">{SMS_AUTO_TRIGGER_META[key].label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {SMS_AUTO_TRIGGER_META[key].description}
                  </span>
                </span>
              </label>
            ))}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="mt-0.5 rounded border-slate-300" checked disabled />
              <span>
                <span className="font-medium text-foreground">Payment Reminder</span>
                <span className="block text-xs">
                  Manual only — use &quot;SMS Payment Reminder&quot; on the invoice page
                </span>
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Provider</Label>
              <Select
                value={sms.provider}
                onValueChange={(v) => onSmsChange({ ...sms, provider: v as SmsProvider })}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="textit">TextIt.biz</SelectItem>
                  <SelectItem value="notifylk">Notify.lk</SelectItem>
                  <SelectItem value="smslenz">SMSlenz.lk</SelectItem>
                  <SelectItem value="generic">Custom HTTP API</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{providerHelp[sms.provider]}</p>
            </div>

            {sms.provider === "generic" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>API URL Template</Label>
                <Input
                  className="rounded-lg font-mono text-sm"
                  placeholder="https://api.example.com/sms?to={to}&msg={message}&key={apiKey}"
                  value={sms.apiUrl}
                  onChange={(e) => onSmsChange({ ...sms, apiUrl: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {sms.provider === "textit"
                  ? "User ID"
                  : sms.provider === "smslenz"
                    ? "User ID"
                    : "API Key / User ID"}
              </Label>
              <Input
                className="rounded-lg"
                value={sms.apiKey}
                onChange={(e) => onSmsChange({ ...sms, apiKey: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                {sms.provider === "textit"
                  ? "Password"
                  : sms.provider === "smslenz"
                    ? "API Key"
                    : "API Secret"}
              </Label>
              <Input
                className="rounded-lg"
                type="password"
                placeholder={sms.apiSecret ? "••••••••" : "Enter API secret"}
                value={sms.apiSecret}
                onChange={(e) => onSmsChange({ ...sms, apiSecret: e.target.value })}
              />
            </div>

            {(sms.provider === "notifylk" || sms.provider === "smslenz" || sms.provider === "generic") && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Sender ID</Label>
                <Input
                  className="rounded-lg"
                  placeholder={sms.provider === "smslenz" ? "SMSlenzDEMO" : "YourBrand"}
                  value={sms.senderId}
                  onChange={(e) => onSmsChange({ ...sms, senderId: e.target.value })}
                />
                {sms.provider === "smslenz" && (
                  <p className="text-xs text-muted-foreground">
                    Use <strong>SMSlenzDEMO</strong> for testing (case sensitive). Use your approved
                    mask after SMSlenz approves it.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-muted/30 p-4 sm:flex-row sm:items-end dark:border-slate-800">
            <div className="flex-1 space-y-2">
              <Label>Test phone number</Label>
              <Input
                className="rounded-lg"
                placeholder="0771234567"
                value={testPhone}
                onChange={(e) => onTestPhoneChange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-lg border-slate-200"
              onClick={onTestSms}
              disabled={testingSms}
            >
              <Send className="h-4 w-4" />
              {testingSms ? "Sending..." : "Send Test SMS"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">SMS Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Edit message templates used when sending SMS. Placeholders:{" "}
            <span className="font-mono text-xs">{SMS_TEMPLATE_PLACEHOLDERS}</span>
          </p>

          {(Object.keys(SMS_TEMPLATE_LABELS) as (keyof SmsTemplates)[]).map((key) => (
            <div key={key} className="space-y-2">
              <Label>{SMS_TEMPLATE_LABELS[key]}</Label>
              <Textarea
                className="min-h-[80px] resize-y rounded-lg font-mono text-sm"
                value={smsTemplates[key]}
                onChange={(e) => onTemplateChange(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
