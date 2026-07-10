#!/bin/bash
set -euo pipefail

# Run ON the new server after Docker is installed and repo is cloned.
# Expects backup files in /root/adrex-migrate/

APP_DIR="/root/adrex-invoice"
MIGRATE_DIR="/root/adrex-migrate"
COMPOSE_FILE="${APP_DIR}/docker-compose.standalone.yml"

echo "==> Migrating AdReX Invoice on new server"

if [ ! -d "${APP_DIR}" ]; then
  echo "ERROR: ${APP_DIR} not found"
  exit 1
fi

cd "${APP_DIR}"

if [ ! -f .env ]; then
  echo "ERROR: ${APP_DIR}/.env missing"
  exit 1
fi

mkdir -p deploy/certbot/www deploy/certbot/conf

echo "==> Building and starting containers..."
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for app..."
for i in $(seq 1 45); do
  if docker exec adrex-invoice-app wget -qO- --timeout=3 http://127.0.0.1:3000/login >/dev/null 2>&1 \
    || curl -sf --max-time 3 http://127.0.0.1/login >/dev/null 2>&1; then
    echo "App is responding"
    break
  fi
  sleep 2
  if [ "$i" -eq 45 ]; then
    echo "WARNING: App not reachable yet"
  fi
done

if [ -f "${MIGRATE_DIR}/prod.db" ]; then
  echo "==> Restoring production database..."
  docker compose -f "${COMPOSE_FILE}" stop invoice-app
  docker run --rm \
    -v adrex-invoice_invoice_data:/data \
    -v "${MIGRATE_DIR}:/backup:ro" \
    alpine sh -c "rm -f /data/prod.db /data/prod.db-wal /data/prod.db-shm && cp /backup/prod.db /data/prod.db && chmod 664 /data/prod.db"
  docker compose -f "${COMPOSE_FILE}" start invoice-app
  echo "Database restored"
fi

if [ -d "${MIGRATE_DIR}/uploads" ] && [ "$(ls -A "${MIGRATE_DIR}/uploads" 2>/dev/null || true)" ]; then
  echo "==> Restoring uploads..."
  docker run --rm \
    -v adrex-invoice_invoice_uploads:/uploads \
    -v "${MIGRATE_DIR}/uploads:/backup:ro" \
    alpine sh -c "cp -a /backup/. /uploads/"
  echo "Uploads restored"
fi

sleep 3
echo "==> Done. Check http://$(hostname -I | awk '{print $1}')/login"
