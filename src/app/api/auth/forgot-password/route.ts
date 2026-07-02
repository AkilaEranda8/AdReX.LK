import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email";
import { appBranding } from "@/lib/company";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const message = "If an account exists with this email, password reset instructions have been sent.";

    if (!user) {
      return NextResponse.json({ message });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: `Reset your ${appBranding.name} password`,
      text: `Click the link to reset your ${appBranding.name} password:\n\n${resetLink}\n\nThis link expires in 1 hour.`,
      html: `<p>Click the link to reset your ${appBranding.name} password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
