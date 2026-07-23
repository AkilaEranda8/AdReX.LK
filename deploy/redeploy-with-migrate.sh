#!/bin/bash
set -euo pipefail
cd /root/adrex-invoice
git fetch origin
git reset --hard origin/main

docker compose -f docker-compose.standalone.yml build invoice-app
docker compose -f docker-compose.standalone.yml up -d

echo "==> Migrating production DB schema..."
docker run --rm \
  -v adrex-invoice_invoice_data:/data \
  -v /root/adrex-invoice/prisma:/prisma \
  -w /prisma \
  node:20-alpine sh -c 'apk add --no-cache openssl libc6-compat >/dev/null && npm install prisma@6.19.3 @prisma/client@6.19.3 --silent && DATABASE_URL="file:/data/prod.db?busy_timeout=10000" npx prisma db push --skip-generate --schema=/prisma/schema.prisma'

docker compose -f docker-compose.standalone.yml restart invoice-app
sleep 4
curl -sI https://admin.adrexlk.com/login | head -5
echo DEPLOY_OK
