#!/bin/sh
set -eu
cd /app

# Openship no interpola ${POSTGRES_PASSWORD} del compose; arma la URL aquí.
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "[api] Falta DATABASE_URL y POSTGRES_PASSWORD. Pégalas en Environment." >&2
    exit 1
  fi
  export DATABASE_URL="postgresql://${POSTGRES_USER:-tostada}:${POSTGRES_PASSWORD}@${POSTGRES_HOST:-postgres}:5432/${POSTGRES_DB:-misupertostada}"
  echo "[api] DATABASE_URL armada hacia ${POSTGRES_HOST:-postgres}"
fi

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
