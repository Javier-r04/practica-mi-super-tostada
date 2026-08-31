#!/bin/sh
set -eu
cd /app

bun packages/db/src/migrate-prod.ts
bun packages/db/src/bootstrap-prod.ts

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  bun packages/db/src/seed.ts
fi

exec node /app/apps/api/dist/main.js
