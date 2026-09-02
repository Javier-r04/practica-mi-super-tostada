#!/bin/sh
set -eu
cd /app

echo "[api] esperando postgres y aplicando migraciones..."
i=0
until bun packages/db/src/migrate-prod.ts; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[api] postgres no respondió a tiempo" >&2
    exit 1
  fi
  echo "[api] postgres no listo, reintento ${i}/30..."
  sleep 2
done

echo "[api] bootstrap (node + argon2)..."
node /app/ops/bootstrap.js

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[api] seed de catálogo (solo primer deploy)..."
  node /app/ops/seed.js
fi

echo "[api] arrancando Nest en 0.0.0.0:${API_PORT:-3001}"
exec node /app/apps/api/dist/main.js
