#!/bin/sh
set -e

cd /app
./node_modules/.bin/prisma db push --skip-generate

if [ "${RUN_DB_SEED:-false}" = "true" ] && [ ! -f /app/data/.seeded ]; then
  node prisma/seed.bundle.cjs && touch /app/data/.seeded
fi

exec "$@"
