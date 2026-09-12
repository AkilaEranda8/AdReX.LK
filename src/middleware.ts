import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const publicPaths = ["/login", "/forgot-password", "/reset-password"];

function isIpHost(host: string) {
  const hostname = host.split(":")[0];
  return (
    hostname === "localhost" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function appOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (isIpHost(host) || process.env.NODE_ENV !== "production") {
    const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";
    return `${proto}://${host}`;
  }

  return `https://${host}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("host") || request.nextUrl.host;
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http" &&
    !isIpHost(host)
  ) {
    return NextResponse.redirect(
      `https://${host}${pathname}${request.nextUrl.search}`,
      301
    );
  }

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api");
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isStatic || isApi) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);
  const origin = appOrigin(request);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
