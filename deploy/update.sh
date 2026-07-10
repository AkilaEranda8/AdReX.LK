#!/bin/bash
# Pull latest code and restart the invoice app (no nginx/ssl changes).
set -euo pipefail

APP_DIR="${APP_DIR:-/root/adrex-invoice}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/docker-compose.prod.yml}"
BRANCH="${BRANCH:-main}"

echo "==> Updating AdReX Invoice in ${APP_DIR}"

if [ ! -d "${APP_DIR}" ]; then
  echo "ERROR: ${APP_DIR} not found. Run deploy/server-setup.sh first."
  exit 1
fi

cd "${APP_DIR}"

if [ ! -f .env ]; then
  echo "ERROR: ${APP_DIR}/.env missing. Copy deploy/production.env.example to .env"
  exit 1
fi

echo "==> Pulling ${BRANCH}..."
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

echo "==> Rebuilding and restarting container..."
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for health check..."
for i in $(seq 1 30); do
  if docker exec adrex-invoice-app node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "==> App is healthy."
    docker logs adrex-invoice-app --tail 20
    exit 0
  fi
  sleep 2
done

echo "WARNING: App did not respond in time. Check logs:"
echo "  docker logs adrex-invoice-app"
exit 1
