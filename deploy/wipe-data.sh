#!/bin/bash
set -euo pipefail

APP_DIR="/root/adrex-invoice"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"

echo "==> Wiping all table data on production..."

cd "${APP_DIR}"

docker-compose -f "${COMPOSE_FILE}" up -d

docker exec adrex-invoice-app node prisma/wipe-all.bundle.cjs
docker exec adrex-invoice-app sh -c 'rm -rf /app/uploads/*'

DATABASE_URL="file:/app/data/prod.db" docker exec adrex-invoice-app node prisma/init-admin.bundle.cjs

echo "==> Done. All tables empty. Admin: admin@adrexlk.com / admin123"
