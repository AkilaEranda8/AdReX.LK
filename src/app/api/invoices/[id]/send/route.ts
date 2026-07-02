import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/lib/pdf";
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
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfData = {
      type: "invoice" as const,
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      client: invoice.client,
      items: invoice.items,
      subTotal: invoice.subTotal,
      discount: invoice.discount,
      advancePayment: invoice.advancePayment,
      grandTotal: invoice.grandTotal,
      remainingBalance: invoice.remainingBalance,
    };

    const result = await sendEmail({
      to: invoice.client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${appBranding.name}`,
      text: buildDocumentEmailBody("invoice", invoice.invoiceNumber, invoice.client.name),
    });

    await logAudit({
      userId: auth.session.userId,
      userName: auth.session.name,
      action: result.sent ? "EMAIL_SENT" : "EMAIL_FAILED",
      entityType: "Invoice",
      entityId: id,
      details: result.message,
    });

    return NextResponse.json({
      ...result,
      pdfGenerated: !!generatePDF(pdfData),
    });
  } catch {
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 500 });
  }
}
