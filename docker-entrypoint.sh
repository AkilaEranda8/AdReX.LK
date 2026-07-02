#!/bin/sh
set -e

cd /app

if [ ! -f /app/data/prod.db ]; then
  echo "Initializing production database (empty tables)..."
  cp /app/prisma/empty.template.db /app/data/prod.db
  DATABASE_URL="file:/app/data/prod.db" node prisma/init-admin.bundle.cjs
  touch /app/data/.initialized
fi

exec "$@"
