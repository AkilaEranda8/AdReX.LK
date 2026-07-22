#!/bin/sh
set -e
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo '---'
docker exec adrex-invoice-app ls -la /app/data/
echo '---'
curl -sI http://127.0.0.1/login | head -5
echo '---'
docker exec adrex-invoice-app node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const clients = await p.client.count();
  const invoices = await p.invoice.count();
  const expenses = await p.expense.count();
  console.log(`clients=${clients} invoices=${invoices} expenses=${expenses}`);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
NODE
