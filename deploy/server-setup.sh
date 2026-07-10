#!/bin/bash
# First-time server setup for invoice.hexalyte.com (IMS-integrated deployment).
set -euo pipefail

DOMAIN="${DOMAIN:-invoice.hexalyte.com}"
APP_DIR="${APP_DIR:-/root/adrex-invoice}"
REPO_URL="${REPO_URL:-https://github.com/AkilaEranda8/AdReX.LK.git}"
BRANCH="${BRANCH:-main}"

echo "==> AdReX Invoice — server setup (${DOMAIN})"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Run as root (or with sudo)."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required. Install Docker and docker compose plugin first."
  exit 1
fi

if [ ! -d /root/hexalyte-main-ims ]; then
  echo "ERROR: /root/hexalyte-main-ims not found."
  echo "This setup expects the existing IMS nginx proxy stack."
  exit 1
fi

if [ ! -d "${APP_DIR}" ]; then
  echo "==> Cloning repository..."
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  echo "==> Repository already exists at ${APP_DIR}"
fi

cd "${APP_DIR}"

if [ ! -f .env ]; then
  echo "==> Creating .env from template..."
  cp deploy/production.env.example .env
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  echo "Generated JWT_SECRET in .env — review SMTP settings if needed."
else
  echo "==> .env already exists — keeping current values"
fi

chmod +x deploy/*.sh

echo "==> Running full deploy (Docker build + nginx + SSL)..."
bash deploy/deploy.sh

echo ""
echo "==> Setup complete."
echo "    URL: https://${DOMAIN}"
echo "    Admin: admin@adrexlk.com / admin123"
echo ""
echo "Future updates:"
echo "    cd ${APP_DIR} && bash deploy/update.sh"
