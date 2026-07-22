import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  defaultProfitAllocation,
  getCompanySettings,
  saveCompanySettings,
  type ProfitAllocationSettings,
} from "@/lib/settings";
import { validateAllocationPercents } from "@/lib/profit-allocation";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const settings = await getCompanySettings();
  return NextResponse.json(settings.profitAllocation || defaultProfitAllocation);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as Partial<ProfitAllocationSettings>;
    const next: ProfitAllocationSettings = {
      ...defaultProfitAllocation,
      ...(await getCompanySettings()).profitAllocation,
      ...body,
    };

    const error = validateAllocationPercents(next);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const existing = await getCompanySettings();
    await saveCompanySettings({
      ...existing,
      profitAllocation: next,
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: "UPDATE",
      entityType: "ProfitAllocationSettings",
      details: `Op ${next.operatingPercent}% / Sav ${next.savingsPercent}%`,
    });

    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
