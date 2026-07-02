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
docker-compose -f "${COMPOSE_FILE}" build
docker-compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for app on port 3002..."
for i in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:3002/login" >/dev/null 2>&1; then
    echo "App is responding on port 3002"
    break
  fi
  sleep 2
  if [ "$i" -eq 45 ]; then
    echo "WARNING: App did not respond on 3002 yet. Check: docker logs adrex-invoice-app"
  fi
done

ensure_nginx_mounts() {
  local with_ssl="${1:-false}"
  python3 - <<PY
from pathlib import Path
path = Path("/root/hexalyte-main-ims/docker-compose.prod.yml")
text = path.read_text()
needle = "      - ./nginx/options-ssl-nginx.conf:/etc/nginx/conf.d/options-ssl-nginx.conf:ro"
snippet = "      - ./nginx/invoice.hexalyte.com.conf:/etc/nginx/conf.d/invoice.hexalyte.com.conf:ro"
ssl = "      - /etc/letsencrypt/live/invoice.hexalyte.com:/etc/letsencrypt/live/invoice.hexalyte.com:ro"
if snippet not in text:
    text = text.replace(needle, needle + "\n" + snippet)
if ${with_ssl} and ssl not in text:
    text = text.replace(snippet, snippet + "\n" + ssl)
path.write_text(text)
PY

  if ! grep -q "invoice.hexalyte.com.conf" "${NGINX_CONF}"; then
    sed -i '/^http {/a\    include /etc/nginx/conf.d/invoice.hexalyte.com.conf;' "${NGINX_CONF}"
  fi
}

reload_nginx() {
  cd "${IMS_DIR}"
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
  sleep 2
  docker exec nginx-proxy-ims nginx -t
  docker exec nginx-proxy-ims nginx -s reload
}

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "==> Phase 1: HTTP-only nginx for ACME + proxy..."
  cp "${APP_DIR}/deploy/nginx-invoice-http.conf" "${NGINX_SNIPPET}"
  ensure_nginx_mounts false
  reload_nginx

  echo "==> Requesting SSL certificate for ${DOMAIN}..."
  certbot certonly --webroot \
    -w "${WEBROOT}" \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email
fi

echo "==> Phase 2: HTTPS nginx config..."
cp "${APP_DIR}/deploy/nginx-invoice.conf" "${NGINX_SNIPPET}"
ensure_nginx_mounts true
reload_nginx

echo "==> Done. https://${DOMAIN}"
