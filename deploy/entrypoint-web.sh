#!/bin/sh
set -eu
cd /app
if [ -f apps/web/server.js ]; then
  exec node apps/web/server.js
fi
if [ -f server.js ]; then
  exec node server.js
fi
echo "No se encontró server.js del standalone de Next." >&2
find /app -name server.js -print
exit 1
