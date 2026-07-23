#!/bin/bash
set -euo pipefail

# Switch production domain to admin.adrexlk.com (SSL + env + rebuild).
DOMAIN="admin.adrexlk.com"
APP_DIR="/root/adrex-invoice"
EMAIL="admin@adrexlk.com"

cd "${APP_DIR}"

echo "==> Pull latest"
git fetch origin main
git reset --hard origin/main

echo "==> Update .env NEXT_PUBLIC_APP_URL"
if [ -f .env ]; then
  if grep -q '^NEXT_PUBLIC_APP_URL=' .env; then
    sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${DOMAIN}|" .env
  else
    echo "NEXT_PUBLIC_APP_URL=https://${DOMAIN}" >> .env
  fi
else
  echo "ERROR: ${APP_DIR}/.env missing"
  exit 1
fi
grep NEXT_PUBLIC_APP_URL .env

apt-get update -qq
apt-get install -y -qq certbot
mkdir -p deploy/certbot/www deploy/certbot/conf

echo "==> HTTP-only nginx for ACME challenge"
cp deploy/nginx-http-only.conf deploy/nginx-standalone.conf
docker compose -f docker-compose.standalone.yml up -d --force-recreate nginx
sleep 2

echo "==> Request Let's Encrypt certificate for ${DOMAIN}"
certbot certonly --webroot \
  -w "${APP_DIR}/deploy/certbot/www" \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring \
  --config-dir "${APP_DIR}/deploy/certbot/conf" \
  --work-dir /var/lib/letsencrypt \
  --logs-dir /var/log/letsencrypt

echo "==> Restore HTTPS nginx config"
git checkout -- deploy/nginx-standalone.conf

# If old invoice.hexalyte.com cert still exists, append redirect server block
if [ -f "deploy/certbot/conf/live/invoice.hexalyte.com/fullchain.pem" ]; then
  cat >> deploy/nginx-standalone.conf <<'OLDSSL'

server {
    listen 443 ssl;
    http2 on;
    server_name invoice.hexalyte.com;

    ssl_certificate     /etc/letsencrypt/live/invoice.hexalyte.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoice.hexalyte.com/privkey.pem;

    location / {
        return 301 https://admin.adrexlk.com$request_uri;
    }
}
OLDSSL
fi

echo "==> Rebuild app with new domain"
docker compose -f docker-compose.standalone.yml build invoice-app
docker compose -f docker-compose.standalone.yml up -d --force-recreate

sleep 4
echo "==> Verify"
curl -sI "https://${DOMAIN}/login" | head -8
echo DOMAIN_SWITCH_OK
