import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateClientId } from "@/lib/numbering";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const clients = await prisma.client.findMany({
    where: status ? { status: status as "ACTIVE" | "INACTIVE" } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const clientId = await generateClientId();

    const client = await prisma.client.create({
      data: {
        clientId,
        name: body.name,
        contactNumber: body.contactNumber,
        email: body.email,
        status: body.status || "ACTIVE",
        notes: body.notes || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
