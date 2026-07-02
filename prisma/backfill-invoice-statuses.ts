/**
 * Backfill invoiceStatus + paymentStatus from remainingBalance after schema migration.
 */
import { PrismaClient } from "@prisma/client";
import { syncInvoiceStatuses } from "../src/lib/numbering";

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany();
  for (const inv of invoices) {
    const isDraft = inv.invoiceStatus === "DRAFT" || inv.remainingBalance === 0 && inv.grandTotal > 0 && inv.paymentStatus === "NONE";
    const { invoiceStatus, paymentStatus } = syncInvoiceStatuses(
      inv.remainingBalance,
      inv.grandTotal,
      inv.invoiceStatus === "DRAFT",
      inv.invoiceStatus
    );
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceStatus, paymentStatus },
    });
  }
  console.log(`Updated ${invoices.length} invoice(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
