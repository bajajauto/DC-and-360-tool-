#!/usr/bin/env bash
# Startup command for Azure App Service (Linux):
#   bash /home/site/wwwroot/startup.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Applying database migrations"
./node_modules/.bin/prisma migrate deploy --schema server/prisma/schema.prisma

# No-op unless the database has no users at all, so this only fires on a fresh
# database. Without it a first deploy comes up with nothing to log in as.
echo "==> Bootstrapping access accounts"
node server/prisma/bootstrapAccessAccounts.js

echo "==> Starting DC & 360 Tool"
# exec so the Node process receives SIGTERM directly and can shut down cleanly.
exec node server/src/index.js
