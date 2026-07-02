import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], invoices: [], quotations: [] });
  }

  const [clients, invoices, quotations] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { clientId: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, clientId: true, name: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q } },
          { client: { name: { contains: q } } },
          { reference: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, invoiceNumber: true, client: { select: { name: true } } },
    }),
    prisma.quotation.findMany({
      where: {
        OR: [
          { quotationNumber: { contains: q } },
          { client: { name: { contains: q } } },
          { reference: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, quotationNumber: true, client: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({ clients, invoices, quotations });
}
