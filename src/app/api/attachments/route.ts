import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  const quotationId = searchParams.get("quotationId");

  const attachments = await prisma.attachment.findMany({
    where: {
      ...(invoiceId ? { invoiceId } : {}),
      ...(quotationId ? { quotationId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fileName = attachment.filePath.split("/").pop();
  if (fileName) {
    try {
      await unlink(path.join(process.cwd(), "uploads", fileName));
    } catch {
      // file may already be missing
    }
  }

  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const invoiceId = formData.get("invoiceId") as string | null;
    const quotationId = formData.get("quotationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!invoiceId && !quotationId) {
      return NextResponse.json({ error: "invoiceId or quotationId required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        fileName: file.name,
        filePath: `/api/attachments/file/${safeName}`,
        mimeType: file.type || "application/octet-stream",
        size: buffer.length,
        invoiceId: invoiceId || null,
        quotationId: quotationId || null,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
