#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="/root/adrex-invoice"
MIGRATE_DIR="/root/adrex-migrate"
COMPOSE_FILE="${APP_DIR}/docker-compose.standalone.yml"
APP_URL="http://95.217.164.153"

echo "==> Installing Docker (Ubuntu 26.04 may need noble repo fallback)"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw git

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list

if ! apt-get update -qq; then
  echo "Docker repo for ${CODENAME} unavailable — falling back to noble"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
fi

apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

docker --version
docker compose version

echo "==> Cloning repo"
if [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}"
  git fetch origin
  git reset --hard origin/main
else
  git clone https://github.com/AkilaEranda8/AdReX.LK.git "${APP_DIR}"
  cd "${APP_DIR}"
fi

mkdir -p deploy/certbot/www deploy/certbot/conf "${MIGRATE_DIR}"

echo "==> HTTP-only nginx (no SSL certs on this IP yet)"
cp deploy/nginx-http-only.conf deploy/nginx-standalone.conf
# include this server IP in server_name
sed -i 's/13.140.134.226/95.217.164.153/' deploy/nginx-standalone.conf

if [ ! -f "${APP_DIR}/.env" ]; then
  if [ -f "${MIGRATE_DIR}/.env" ]; then
    cp "${MIGRATE_DIR}/.env" "${APP_DIR}/.env"
  else
    JWT="$(openssl rand -base64 48 | tr -d '\n')"
    cat > "${APP_DIR}/.env" <<EOF
JWT_SECRET=${JWT}
NEXT_PUBLIC_APP_URL=${APP_URL}
DATABASE_URL=file:/app/data/prod.db
RUN_DB_SEED=false
EOF
  fi
fi

sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_URL}|" "${APP_DIR}/.env" || true
grep -q '^NEXT_PUBLIC_APP_URL=' "${APP_DIR}/.env" || echo "NEXT_PUBLIC_APP_URL=${APP_URL}" >> "${APP_DIR}/.env"
sed -i 's/RUN_DB_SEED=true/RUN_DB_SEED=false/' "${APP_DIR}/.env" || true
grep -q 'RUN_DB_SEED=' "${APP_DIR}/.env" || echo 'RUN_DB_SEED=false' >> "${APP_DIR}/.env"

echo "==> Building and starting"
docker compose -f "${COMPOSE_FILE}" build
docker compose -f "${COMPOSE_FILE}" up -d

echo "==> Waiting for first boot"
sleep 8

if [ -f "${MIGRATE_DIR}/prod.db" ]; then
  echo "==> Restoring production database"
  docker compose -f "${COMPOSE_FILE}" stop invoice-app
  docker run --rm \
    -v adrex-invoice_invoice_data:/data \
    -v "${MIGRATE_DIR}:/backup:ro" \
    alpine sh -c "rm -f /data/prod.db /data/prod.db-wal /data/prod.db-shm /data/.initialized && cp /backup/prod.db /data/prod.db && chown 1001:1001 /data/prod.db && chmod 664 /data/prod.db && touch /data/.initialized"
  docker compose -f "${COMPOSE_FILE}" start invoice-app
  echo "Database restored"
fi

echo "==> Waiting for app"
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
curl -sI http://127.0.0.1/login | head -8 || true
echo HOST_OK
