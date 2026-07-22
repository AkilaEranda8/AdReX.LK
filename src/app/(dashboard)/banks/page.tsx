"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Plus, Trash2, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/loading";
import api from "@/lib/api";
import type { BankAccount } from "@/lib/settings";
import toast from "react-hot-toast";

const emptyBank = (): BankAccount => ({
  name: "",
  accountNo: "",
  branch: "",
  accountName: "",
});

export default function BanksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([emptyBank()]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/settings");
      setBanks(res.data.banks?.length ? res.data.banks : [emptyBank()]);
    } catch {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateBank = (index: number, field: keyof BankAccount, value: string) => {
    setBanks((prev) => prev.map((bank, i) => (i === index ? { ...bank, [field]: value } : bank)));
  };

  const addBank = () => setBanks((prev) => [...prev, emptyBank()]);

  const removeBank = (index: number) => {
    setBanks((prev) => (prev.length <= 1 ? [emptyBank()] : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    const cleaned = banks.filter((b) => b.name.trim() || b.accountNo.trim());
    for (const bank of cleaned) {
      if (!bank.name.trim() || !bank.accountNo.trim()) {
        toast.error("Each bank needs a name and account number");
        return;
      }
    }
    setSaving(true);
    try {
      await api.put("/settings", { banks: cleaned });
      setBanks(cleaned.length ? cleaned : [emptyBank()]);
      toast.success("Bank accounts saved");
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      toast.error(
        error.response?.status === 403
          ? "Only admins can update bank accounts"
          : "Failed to save bank accounts"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add company bank accounts for invoices, receipts, and profit allocation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings">
            <Button variant="outline" className="gap-2 rounded-lg">
              <Settings2 className="h-4 w-4" />
              Company Settings
            </Button>
          </Link>
          <Button type="button" variant="outline" className="gap-2 rounded-lg" onClick={addBank}>
            <Plus className="h-4 w-4" />
            Add Bank
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Landmark className="h-5 w-5 text-indigo-600" />
            Company Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These accounts appear under Payment Information on invoices and can be selected as
            Operating / Savings banks in Profit Allocation.
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
    </div>
  );
}
