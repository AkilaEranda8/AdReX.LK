import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

  const payments = await prisma.payment.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { id: true, clientId: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: { paymentDate: "desc" },
    take: limit,
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json({
    payments,
    summary: {
      count: payments.length,
      totalCollected: Math.round(total * 100) / 100,
    },
  });
}
