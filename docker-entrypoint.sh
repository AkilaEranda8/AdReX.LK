#!/bin/sh
set -e

cd /app

if [ ! -f /app/data/prod.db ]; then
  echo "Initializing production database..."
  cp /app/prisma/prod.template.db /app/data/prod.db
  DATABASE_URL="file:/app/data/prod.db" node prisma/seed.bundle.cjs
  touch /app/data/.seeded
fi

exec "$@"
