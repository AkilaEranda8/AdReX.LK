import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const dbPath = dbUrl.replace("file:", "");
  const resolved = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), "prisma", dbPath.replace(/^\.\//, ""));

  try {
    const buffer = await readFile(resolved);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="bill-master-backup-${new Date().toISOString().slice(0, 10)}.db"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
