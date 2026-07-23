#!/bin/bash
set -euo pipefail

DOMAIN="admin.adrexlk.com"
APP_DIR="/root/adrex-invoice"
EMAIL="admin@adrexlk.com"

cd "${APP_DIR}"

apt-get update -qq
apt-get install -y -qq certbot

mkdir -p deploy/certbot/www deploy/certbot/conf

# Use HTTP-only nginx so ACME challenge works without needing a cert yet
cp deploy/nginx-http-only.conf deploy/nginx-standalone.conf
docker compose -f docker-compose.standalone.yml exec -T nginx nginx -t
docker compose -f docker-compose.standalone.yml exec -T nginx nginx -s reload

echo "==> Requesting Let's Encrypt certificate for ${DOMAIN}"
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

# Restore full HTTPS nginx config from git
git checkout -- deploy/nginx-standalone.conf

docker compose -f docker-compose.standalone.yml exec -T nginx nginx -t
docker compose -f docker-compose.standalone.yml exec -T nginx nginx -s reload

echo "==> HTTPS ready"
curl -sI "https://${DOMAIN}/login" | head -8
