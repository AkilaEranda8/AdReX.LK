import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.upsert({
    where: { email: "admin@adrexlk.com" },
    update: {},
    create: {
      email: "admin@adrexlk.com",
      username: "admin",
      password: adminPassword,
      name: "System Admin",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@adrexlk.com" },
    update: {},
    create: {
      email: "staff@adrexlk.com",
      username: "staff",
      password: staffPassword,
      name: "Staff User",
      role: "STAFF",
    },
  });

  const client1 = await prisma.client.upsert({
    where: { clientId: "CLI-000001" },
    update: {},
    create: {
      clientId: "CLI-000001",
      name: "Acme Corporation",
      contactNumber: "+94 77 123 4567",
      email: "contact@acme.com",
      status: "ACTIVE",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { clientId: "CLI-000002" },
    update: {},
    create: {
      clientId: "CLI-000002",
      name: "Tech Solutions Ltd",
      contactNumber: "+94 71 987 6543",
      email: "info@techsolutions.lk",
      status: "ACTIVE",
    },
  });

  await prisma.sequenceCounter.upsert({
    where: { id: "client" },
    update: { value: 2 },
    create: { id: "client", value: 2 },
  });

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 30);
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${yearMonth}-000001`,
      clientId: client1.id,
      invoiceDate: now,
      dueDate,
      reference: "PO-2026-001",
      notes: "Payment due within 30 days.",
      taxRate: 0,
      subTotal: 10000,
      discount: 0,
      advancePayment: 5000,
      grandTotal: 10000,
      remainingBalance: 5000,
      invoiceStatus: "PENDING",
      paymentStatus: "PARTIALLY_PAID",
      items: {
        create: [
          { itemName: "Web Development", price: 8000, quantity: 1, total: 8000 },
          { itemName: "Hosting (Annual)", price: 2000, quantity: 1, total: 2000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${yearMonth}-000002`,
      clientId: client2.id,
      invoiceDate: now,
      dueDate,
      invoiceStatus: "DRAFT",
      paymentStatus: "NONE",
      subTotal: 5000,
      grandTotal: 5000,
      remainingBalance: 5000,
      items: {
        create: [{ itemName: "Consulting (Draft)", price: 5000, quantity: 1, total: 5000 }],
      },
    },
  });

  await prisma.client.update({
    where: { id: client1.id },
    data: { creditBalance: 5000 },
  });

  await prisma.quotation.create({
    data: {
      quotationNumber: `QT-${yearMonth}-000001`,
      clientId: client2.id,
      quotationDate: now,
      validUntil: dueDate,
      reference: "REF-QT-001",
      notes: "Valid for 30 days from quotation date.",
      status: "PENDING",
      grandTotal: 15000,
      items: {
        create: [
          { itemName: "Mobile App Development", price: 15000, quantity: 1, total: 15000 },
        ],
      },
    },
  });

  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      data: JSON.stringify({
        brand: "AdReX.LK",
        name: "ADREX.LK (PVT) LTD",
        tagline: "YOUR SUCCESS OUR BUSINESS",
        website: "www.adrexlk.com",
        phones: ["+94 70 420 3048", "+94 71 420 3048"],
        emails: ["adrexlkmarketing@gmail.com", "management.adrexlk@gmail.com"],
      }),
    },
  });

  await prisma.sequenceCounter.upsert({
    where: { id: `invoice-${yearMonth}` },
    update: { value: 2 },
    create: { id: `invoice-${yearMonth}`, value: 2 },
  });

  await prisma.sequenceCounter.upsert({
    where: { id: `quotation-${yearMonth}` },
    update: { value: 1 },
    create: { id: `quotation-${yearMonth}`, value: 1 },
  });

  console.log("Seed completed!");
  console.log("Admin: admin@adrexlk.com / admin123");
  console.log("Staff: staff@adrexlk.com / staff123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
