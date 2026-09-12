#!/bin/bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/backups"
OUT="${BACKUP_DIR}/adrex-prod-${TS}.db"

mkdir -p "${BACKUP_DIR}"

echo "==> Copying SQLite DB from running app container"
docker cp adrex-invoice-app:/app/data/prod.db "${OUT}"
chmod 644 "${OUT}"

ls -lah "${OUT}"
sha256sum "${OUT}"
echo "BACKUP_FILE=${OUT}"
echo "BACKUP_OK"
