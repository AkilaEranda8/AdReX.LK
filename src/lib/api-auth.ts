import { NextResponse } from "next/server";
import { getSessionFromRequest, type JWTPayload } from "./auth";
import type { Role } from "@prisma/client";
import { NextRequest } from "next/server";

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: Role[]
): Promise<{ session: JWTPayload } | NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session };
}
