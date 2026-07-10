#!/bin/bash
set -euo pipefail

DOMAIN="invoice.hexalyte.com"
APP_DIR="/root/adrex-invoice"
EMAIL="admin@adrexlk.com"

cd "${APP_DIR}"

apt-get update -qq
apt-get install -y -qq certbot

mkdir -p deploy/certbot/www deploy/certbot/conf

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

# Copy certs into the path nginx expects (same volume mount)
mkdir -p "${APP_DIR}/deploy/certbot/conf/live/${DOMAIN}"

cat > "${APP_DIR}/deploy/nginx-standalone.conf" <<'NGINX'
upstream invoice_app {
    server adrex-invoice-app:3000;
}

server {
    listen 80;
    server_name invoice.hexalyte.com 13.140.134.226 _;

    client_max_body_size 25m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://invoice.hexalyte.com$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name invoice.hexalyte.com;

    ssl_certificate     /etc/letsencrypt/live/invoice.hexalyte.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invoice.hexalyte.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 25m;

    location / {
        proxy_pass http://invoice_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering on;
        proxy_read_timeout 120s;
    }
}
NGINX

# Ensure docker volume sees host certs — compose mounts ./deploy/certbot/conf
# certbot already wrote into that path when using --config-dir

docker compose -f docker-compose.standalone.yml exec -T nginx nginx -t
docker compose -f docker-compose.standalone.yml exec -T nginx nginx -s reload

echo "==> HTTPS ready"
curl -sI https://invoice.hexalyte.com/login | head -8
