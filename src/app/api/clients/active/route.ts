import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, clientId: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}
