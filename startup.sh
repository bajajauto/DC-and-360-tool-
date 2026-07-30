#!/usr/bin/env bash
# Startup command for Azure App Service (Linux):
#   bash /home/site/wwwroot/startup.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Applying database migrations"
./node_modules/.bin/prisma migrate deploy --schema server/prisma/schema.prisma

echo "==> Starting DC & 360 Tool"
# exec so the Node process receives SIGTERM directly and can shut down cleanly.
exec node server/src/index.js
