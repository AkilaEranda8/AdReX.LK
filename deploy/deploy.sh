#!/bin/bash
set -euo pipefail

DOMAIN="invoice.hexalyte.com"
APP_DIR="/root/adrex-invoice"
IMS_DIR="/root/hexalyte-main-ims"
NGINX_CONF="${IMS_DIR}/nginx/nginx-production.conf"
NGINX_SNIPPET="${IMS_DIR}/nginx/invoice.hexalyte.com.conf"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
WEBROOT="${IMS_DIR}/nginx/html"

echo "==> Deploying AdReX Invoice to ${DOMAIN}"

if [ ! -d "${APP_DIR}" ]; then
  echo "ERROR: ${APP_DIR} not found. Clone the repo first."
  exit 1
fi

cd "${APP_DIR}"

if [ ! -f .env ]; then
  echo "ERROR: ${APP_DIR}/.env missing. Create it from deploy/production.env.example"
  exit 1
fi

echo "==> Building and starting invoice app (port 3002)..."
docker compose -f "${COMPOSE_FILE}" build --no-cache
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for app health..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:3002" >/dev/null 2>&1; then
    echo "App is responding on port 3002"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "WARNING: App did not respond on 3002 yet. Check: docker logs adrex-invoice-app"
  fi
done

echo "==> Installing nginx snippet..."
cp "${APP_DIR}/deploy/nginx-invoice.conf" "${NGINX_SNIPPET}"

if ! grep -q "invoice.hexalyte.com.conf" "${NGINX_CONF}"; then
  sed -i '/^http {/a\    include /etc/nginx/conf.d/invoice.hexalyte.com.conf;' "${NGINX_CONF}"
fi

if ! grep -q "invoice.hexalyte.com:/etc/letsencrypt/live/invoice.hexalyte.com" "${IMS_DIR}/docker-compose.prod.yml"; then
  python3 - <<'PY'
from pathlib import Path
path = Path("/root/hexalyte-main-ims/docker-compose.prod.yml")
text = path.read_text()
needle = "      - ./nginx/options-ssl-nginx.conf:/etc/nginx/conf.d/options-ssl-nginx.conf:ro"
insert = needle + "\n      - /etc/letsencrypt/live/invoice.hexalyte.com:/etc/letsencrypt/live/invoice.hexalyte.com:ro\n      - ./nginx/invoice.hexalyte.com.conf:/etc/nginx/conf.d/invoice.hexalyte.com.conf:ro"
if insert not in text:
    text = text.replace(needle, insert)
    path.write_text(text)
PY
fi

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "==> Requesting SSL certificate for ${DOMAIN}..."
  certbot certonly --webroot \
    -w "${WEBROOT}" \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email || true
fi

echo "==> Reloading IMS nginx (existing apps stay running)..."
cd "${IMS_DIR}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
docker exec nginx-proxy-ims nginx -t
docker exec nginx-proxy-ims nginx -s reload

echo "==> Done. https://${DOMAIN}"
