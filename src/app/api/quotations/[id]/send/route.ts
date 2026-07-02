import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildDocumentEmailBody } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { appBranding } from "@/lib/company";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { client: true, items: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const result = await sendEmail({
      to: quotation.client.email,
      subject: `Quotation ${quotation.quotationNumber} from ${appBranding.name}`,
      text: buildDocumentEmailBody("quotation", quotation.quotationNumber, quotation.client.name),
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "EMAIL_SENT" : "EMAIL_FAILED",
      entityType: "Quotation",
      entityId: id,
      details: result.message,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to send quotation" }, { status: 500 });
  }
}
