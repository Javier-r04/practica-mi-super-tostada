#!/bin/sh
set -eu
# Docker pisa HOSTNAME con el id del contenedor. Next lo usa para bind;
# si queda en localhost/hostname, OpenResty da 502.
export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"
cd /app
if [ -f apps/web/server.js ]; then
  echo "[web] standalone apps/web/server.js en ${HOSTNAME}:${PORT}"
  exec node apps/web/server.js
fi
if [ -f server.js ]; then
  echo "[web] standalone server.js en ${HOSTNAME}:${PORT}"
  exec node server.js
fi
echo "No se encontró server.js del standalone de Next." >&2
find /app -name server.js -print
exit 1
