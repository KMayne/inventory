#!/bin/sh
set -e

export DATA_DIR="${DATA_DIR:-/data}"

# Run database migrations
pnpm --filter @homie/server exec prisma migrate deploy

# Start the server
pnpm --filter @homie/server start
