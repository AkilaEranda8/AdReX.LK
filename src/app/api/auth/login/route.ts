import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, COOKIE_NAME, REMEMBER_MAX_AGE, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { identifier, password, rememberMe } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Email/username and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      rememberMe
    );

    const maxAge = rememberMe ? REMEMBER_MAX_AGE : COOKIE_MAX_AGE;
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
