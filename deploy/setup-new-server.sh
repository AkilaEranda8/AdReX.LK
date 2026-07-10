#!/bin/bash
set -euo pipefail

APP_DIR="/root/adrex-invoice"
MIGRATE_DIR="/root/adrex-migrate"
COMPOSE_FILE="${APP_DIR}/docker-compose.standalone.yml"

echo "==> Cloning / updating repo"
if [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}"
  git fetch origin
  git reset --hard origin/main
else
  git clone https://github.com/AkilaEranda8/AdReX.LK.git "${APP_DIR}"
  cd "${APP_DIR}"
fi

if [ -f "${MIGRATE_DIR}/.env" ]; then
  cp "${MIGRATE_DIR}/.env" "${APP_DIR}/.env"
fi

# Ensure seed does not wipe restored data
sed -i 's/RUN_DB_SEED=true/RUN_DB_SEED=false/' "${APP_DIR}/.env" || true
grep -q 'RUN_DB_SEED=' "${APP_DIR}/.env" || echo 'RUN_DB_SEED=false' >> "${APP_DIR}/.env"

mkdir -p deploy/certbot/www deploy/certbot/conf
chmod +x deploy/migrate-to-new-server.sh || true

echo "==> Building and starting containers..."
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for first boot..."
sleep 8

if [ -f "${MIGRATE_DIR}/prod.db" ]; then
  echo "==> Restoring production database..."
  docker compose -f "${COMPOSE_FILE}" stop invoice-app
  docker run --rm \
    -v adrex-invoice_invoice_data:/data \
    -v "${MIGRATE_DIR}:/backup:ro" \
    alpine sh -c "rm -f /data/prod.db /data/prod.db-wal /data/prod.db-shm /data/.initialized && cp /backup/prod.db /data/prod.db && chown 1001:1001 /data/prod.db && chmod 664 /data/prod.db && touch /data/.initialized"
  docker compose -f "${COMPOSE_FILE}" start invoice-app
  echo "Database restored"
fi

if [ -d "${MIGRATE_DIR}/uploads" ] && [ "$(ls -A "${MIGRATE_DIR}/uploads" 2>/dev/null || true)" ]; then
  echo "==> Restoring uploads..."
  docker run --rm \
    -v adrex-invoice_invoice_uploads:/uploads \
    -v "${MIGRATE_DIR}/uploads:/backup:ro" \
    alpine sh -c "cp -a /backup/. /uploads/ && chown -R 1001:1001 /uploads"
  echo "Uploads restored"
fi

echo "==> Waiting for app..."
for i in $(seq 1 45); do
  if curl -sf --max-time 3 http://127.0.0.1/login >/dev/null 2>&1; then
    echo "App is responding on port 80"
    break
  fi
  sleep 2
  if [ "$i" -eq 45 ]; then
    echo "WARNING: App not reachable yet"
    docker compose -f "${COMPOSE_FILE}" ps
    docker logs adrex-invoice-app --tail 40 || true
  fi
done

echo "==> Done"
curl -sI http://127.0.0.1/login | head -5 || true
