#!/bin/sh
set -e

echo "[web] Generating Prisma client..."
pnpm db:generate

echo "[web] Applying Prisma schema..."
pnpm db:push

echo "[web] Starting Astro dev server..."
exec pnpm dev --host 0.0.0.0 --port 4321
