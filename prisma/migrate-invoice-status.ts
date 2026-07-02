/**
 * One-time migration: maps legacy Invoice.status → invoiceStatus + paymentStatus.
 * Run after `npx prisma db push` if upgrading an existing database.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEGACY_MAP: Record<
  string,
  { invoiceStatus: "DRAFT" | "PENDING" | "COMPLETED" | "CANCELLED"; paymentStatus: "NONE" | "UNPAID" | "PARTIALLY_PAID" | "PAID" }
> = {
  DRAFT: { invoiceStatus: "DRAFT", paymentStatus: "NONE" },
  UNPAID: { invoiceStatus: "PENDING", paymentStatus: "UNPAID" },
  PARTIALLY_PAID: { invoiceStatus: "PENDING", paymentStatus: "PARTIALLY_PAID" },
  PAID: { invoiceStatus: "COMPLETED", paymentStatus: "PAID" },
};

async function main() {
  const columns = await prisma.$queryRaw<{ name: string }[]>`
    PRAGMA table_info(Invoice);
  `;
  const names = columns.map((c) => c.name);

  if (!names.includes("invoiceStatus") || !names.includes("paymentStatus")) {
    console.log("New status columns not found — run prisma db push first.");
    return;
  }

  if (!names.includes("status")) {
    console.log("Legacy status column already removed — nothing to migrate.");
    return;
  }

  const rows = await prisma.$queryRaw<{ id: string; status: string }[]>`
    SELECT id, status FROM Invoice
  `;

  for (const row of rows) {
    const mapped = LEGACY_MAP[row.status] ?? LEGACY_MAP.UNPAID;
    await prisma.$executeRaw`
      UPDATE Invoice
      SET invoiceStatus = ${mapped.invoiceStatus}, paymentStatus = ${mapped.paymentStatus}
      WHERE id = ${row.id}
    `;
  }

  console.log(`Migrated ${rows.length} invoice(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
