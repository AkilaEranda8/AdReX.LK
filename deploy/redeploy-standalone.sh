#!/bin/bash
set -euo pipefail
cd /root/adrex-invoice
git pull origin main
docker compose -f docker-compose.standalone.yml build invoice-app
docker compose -f docker-compose.standalone.yml up -d
sleep 3
curl -sI https://invoice.hexalyte.com/login | head -5
echo DEPLOY_OK
