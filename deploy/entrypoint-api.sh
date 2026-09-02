#!/bin/sh
set -eu
cd /app

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "[api] Falta POSTGRES_PASSWORD en Environment del servicio api." >&2
  exit 1
fi

# Reconstruye siempre: un DATABASE_URL pegado con host malo (ESERVFAIL) no se reutiliza.
HOST="${POSTGRES_HOST:-postgres}"
export DATABASE_URL="postgresql://${POSTGRES_USER:-tostada}:${POSTGRES_PASSWORD}@${HOST}:5432/${POSTGRES_DB:-misupertostada}"
echo "[api] DATABASE_URL → ${HOST}:5432/${POSTGRES_DB:-misupertostada}"

echo "[api] esperando postgres y aplicando migraciones..."
i=0
until bun packages/db/src/migrate-prod.ts; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[api] postgres no respondió a tiempo (¿el servicio postgres está Running?)" >&2
    exit 1
  fi
  echo "[api] postgres no listo, reintento ${i}/30..."
  sleep 2
done

echo "[api] bootstrap..."
bun packages/db/src/bootstrap-prod.ts

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[api] seed de catálogo (solo primer deploy)..."
  bun packages/db/src/seed.ts
fi

echo "[api] arrancando Nest en 0.0.0.0:${API_PORT:-3001}"
exec node /app/apps/api/dist/main.js
