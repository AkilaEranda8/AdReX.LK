const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const tables = [
  "PasswordResetToken",
  "Attachment",
  "Payment",
  "InvoiceItem",
  "Invoice",
  "QuotationItem",
  "Quotation",
  "RecurringInvoice",
  "AuditLog",
  "CompanySettings",
  "SequenceCounter",
  "Client",
  "User",
];

async function main() {
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF");

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }

  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
  console.log("All tables cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
