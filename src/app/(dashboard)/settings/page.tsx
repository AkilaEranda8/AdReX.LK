"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import { SettingsStatCards } from "@/components/settings/settings-stat-cards";
import { SmsSettingsCard, type SmsForm } from "@/components/settings/sms-settings-card";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/api";
import { defaultSmsTemplates, type SmsTemplates } from "@/lib/sms";
import type { SmsProvider } from "@/lib/settings";
import toast from "react-hot-toast";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Palette,
  Building2,
  Landmark,
  Plus,
  Trash2,
  Save,
} from "lucide-react";

type SmtpForm = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

type BankAccount = {
  name: string;
  accountNo: string;
  branch: string;
  accountName: string;
};

const emptyBank = (): BankAccount => ({
  name: "",
  accountNo: "",
  branch: "",
  accountName: "",
});

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [form, setForm] = useState({
    brand: "",
    name: "",
    tagline: "",
    website: "",
    phones: "",
    emails: "",
    remarks: "",
  });
  const [banks, setBanks] = useState<BankAccount[]>([emptyBank()]);
  const [smtp, setSmtp] = useState<SmtpForm>({
    host: "",
    port: 587,
    user: "",
    pass: "",
    from: "",
    secure: false,
  });
  const [sms, setSms] = useState<SmsForm>({
    enabled: true,
    provider: "textit",
    apiUrl: "",
    apiKey: "",
    apiSecret: "",
    senderId: "",
    sendOnInvoiceCreate: true,
  });
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplates>(defaultSmsTemplates);

  useEffect(() => {
    api.get("/settings").then((res) => {
      const d = res.data;
      setForm({
        brand: d.brand,
        name: d.name,
        tagline: d.tagline,
        website: d.website,
        phones: d.phones.join(", "),
        emails: d.emails.join(", "),
        remarks: d.remarks,
      });
      setBanks(d.banks?.length ? d.banks : [emptyBank()]);
      if (d.smtp) {
        setSmtp({
          host: d.smtp.host || "",
          port: d.smtp.port || 587,
          user: d.smtp.user || "",
          pass: d.smtp.pass || "",
          from: d.smtp.from || "",
          secure: !!d.smtp.secure,
        });
      }
      if (d.sms) {
        setSms({
          enabled: d.sms.enabled !== false,
          provider: (d.sms.provider as SmsProvider) || "textit",
          apiUrl: d.sms.apiUrl || "",
          apiKey: d.sms.apiKey || "",
          apiSecret: d.sms.apiSecret || "",
          senderId: d.sms.senderId || "",
          sendOnInvoiceCreate: d.sms.sendOnInvoiceCreate !== false,
        });
      }
      if (d.smsTemplates) {
        setSmsTemplates({ ...defaultSmsTemplates, ...d.smsTemplates });
      }
      setEmailConfigured(!!d.emailConfigured);
      setSmsConfigured(!!d.smsConfigured);
      setLoading(false);
    });
  }, []);

  const phoneCount = useMemo(
    () => form.phones.split(",").map((s) => s.trim()).filter(Boolean).length,
    [form.phones]
  );
  const emailCount = useMemo(
    () => form.emails.split(",").map((s) => s.trim()).filter(Boolean).length,
    [form.emails]
  );
  const activeBankCount = useMemo(
    () => banks.filter((b) => b.name || b.accountNo).length,
    [banks]
  );

  const buildPayload = () => ({
    ...form,
    phones: form.phones.split(",").map((s) => s.trim()).filter(Boolean),
    emails: form.emails.split(",").map((s) => s.trim()).filter(Boolean),
    banks: banks.filter((b) => b.name || b.accountNo),
    smtp,
    sms,
    smsTemplates,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings", buildPayload());
      const res = await api.get("/settings");
      setEmailConfigured(!!res.data.emailConfigured);
      setSmsConfigured(!!res.data.smsConfigured);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      if (!emailConfigured && !smtp.host) {
        toast.error("Save SMTP settings first");
        return;
      }
      await api.put("/settings", buildPayload());
      const res = await api.post("/settings/test-email", {});
      if (res.data.sent) {
        toast.success(res.data.message);
        setEmailConfigured(true);
      } else {
        toast.error(res.data.message);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Test email failed");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error("Enter a test phone number");
      return;
    }
    setTestingSms(true);
    try {
      await api.put("/settings", buildPayload());
      const res = await api.post("/settings/test-sms", { to: testPhone.trim() });
      if (res.data.sent) {
        toast.success(res.data.message);
        setSmsConfigured(true);
      } else {
        toast.error(res.data.message);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Test SMS failed");
    } finally {
      setTestingSms(false);
    }
  };

  const handleTemplateChange = (key: keyof SmsTemplates, value: string) => {
    setSmsTemplates((prev) => ({ ...prev, [key]: value }));
  };

  const updateBank = (index: number, field: keyof BankAccount, value: string) => {
    setBanks((prev) => prev.map((bank, i) => (i === index ? { ...bank, [field]: value } : bank)));
  };

  const addBank = () => setBanks((prev) => [...prev, emptyBank()]);

  const removeBank = (index: number) => {
    setBanks((prev) => (prev.length <= 1 ? [emptyBank()] : prev.filter((_, i) => i !== index)));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage company profile, bank details, email, and SMS configuration
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <SettingsStatCards
        emailConfigured={emailConfigured}
        smsConfigured={smsConfigured}
        brand={form.brand}
        phoneCount={phoneCount}
        emailCount={emailCount}
        bankCount={activeBankCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Business Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(["brand", "name", "tagline", "website"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key}</Label>
                  <Input
                    className="rounded-lg"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label>Phones (comma separated)</Label>
                <Input
                  className="rounded-lg"
                  placeholder="+94 70 420 3048, +94 71 420 3048"
                  value={form.phones}
                  onChange={(e) => setForm({ ...form, phones: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Emails (comma separated)</Label>
                <Input
                  className="rounded-lg"
                  placeholder="info@company.com, billing@company.com"
                  value={form.emails}
                  onChange={(e) => setForm({ ...form, emails: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Payment Remarks</Label>
                <Textarea
                  className="min-h-[100px] resize-none rounded-lg"
                  placeholder="Instructions shown on invoices and PDFs..."
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Landmark className="h-5 w-5 text-indigo-600" />
                Bank Details
              </CardTitle>
              <Button type="button" variant="outline" size="sm" className="gap-1 rounded-lg" onClick={addBank}>
                <Plus className="h-4 w-4" />
                Add Bank
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bank accounts shown on invoice and receipt PDFs under Payment Information.
              </p>
              {banks.map((bank, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200/80 bg-muted/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Bank Account {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeBank(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        className="rounded-lg bg-background"
                        placeholder="Commercial Bank"
                        value={bank.name}
                        onChange={(e) => updateBank(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account No</Label>
                      <Input
                        className="rounded-lg bg-background"
                        placeholder="1234567890"
                        value={bank.accountNo}
                        onChange={(e) => updateBank(index, "accountNo", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input
                        className="rounded-lg bg-background"
                        placeholder="Colombo"
                        value={bank.branch}
                        onChange={(e) => updateBank(index, "branch", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Name</Label>
                      <Input
                        className="rounded-lg bg-background"
                        placeholder="Account holder name"
                        value={bank.accountName}
                        onChange={(e) => updateBank(index, "accountName", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Mail className="h-5 w-5 text-indigo-600" />
                Email (SMTP)
              </CardTitle>
              {emailConfigured ? (
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Not configured
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure SMTP here or via environment variables (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SMTP_HOST</code>,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SMTP_USER</code>,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SMTP_PASS</code>). Env values take priority
                when set.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>SMTP Host</Label>
                  <Input
                    className="rounded-lg"
                    placeholder="smtp.gmail.com"
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    className="rounded-lg"
                    type="number"
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) || 587 })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={smtp.secure}
                      onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                    />
                    Use SSL/TLS (port 465)
                  </label>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Username</Label>
                  <Input
                    className="rounded-lg"
                    placeholder="your@email.com"
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Password / App Password</Label>
                  <Input
                    className="rounded-lg"
                    type="password"
                    placeholder={smtp.pass ? "••••••••" : "Enter SMTP password"}
                    value={smtp.pass}
                    onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>From Address</Label>
                  <Input
                    className="rounded-lg"
                    placeholder="noreply@yourcompany.com"
                    value={smtp.from}
                    onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-lg border-slate-200"
                onClick={handleTestEmail}
                disabled={testingEmail}
              >
                <Mail className="h-4 w-4" />
                {testingEmail ? "Sending..." : "Send Test Email"}
              </Button>
            </CardContent>
          </Card>

          <SmsSettingsCard
            sms={sms}
            smsTemplates={smsTemplates}
            smsConfigured={smsConfigured}
            testPhone={testPhone}
            testingSms={testingSms}
            onSmsChange={setSms}
            onTemplateChange={handleTemplateChange}
            onTestPhoneChange={setTestPhone}
            onTestSms={handleTestSms}
          />
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Palette className="h-5 w-5 text-indigo-600" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose light, dark, or match your system preference across the app.
              </p>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Document Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Brand:</span> {form.brand || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Legal name:</span> {form.name || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Tagline:</span> {form.tagline || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Website:</span> {form.website || "—"}
              </p>
              <div className="rounded-lg border border-dashed border-slate-200 bg-muted/40 p-3 text-xs leading-relaxed">
                These details appear on invoices, quotations, and downloaded PDFs.
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-indigo-900">Save your changes</p>
              <p className="mt-1 text-xs text-indigo-700/80">
                Updates apply to new PDFs, emails, and SMS after saving.
              </p>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
