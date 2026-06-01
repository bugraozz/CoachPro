#!/bin/sh
set -e

LOCKFILE_HASH_FILE="node_modules/.lockfile-hash"
CURRENT_LOCKFILE_HASH=""

if [ -f pnpm-lock.yaml ] && [ -f package.json ]; then
	CURRENT_LOCKFILE_HASH="$(sha256sum pnpm-lock.yaml package.json | sha256sum | awk '{print $1}')"
fi

NEEDS_INSTALL="0"

if [ ! -f node_modules/.modules.yaml ]; then
	NEEDS_INSTALL="1"
fi

if [ -n "$CURRENT_LOCKFILE_HASH" ]; then
	if [ ! -f "$LOCKFILE_HASH_FILE" ]; then
		NEEDS_INSTALL="1"
	elif [ "$(cat "$LOCKFILE_HASH_FILE")" != "$CURRENT_LOCKFILE_HASH" ]; then
		NEEDS_INSTALL="1"
	fi
fi

if [ "$NEEDS_INSTALL" = "1" ]; then
	echo "[web] Installing dependencies..."
	CI=1 pnpm install --frozen-lockfile
	if [ -n "$CURRENT_LOCKFILE_HASH" ]; then
		echo "$CURRENT_LOCKFILE_HASH" > "$LOCKFILE_HASH_FILE"
	fi
fi

echo "[web] Generating Prisma client..."
pnpm db:generate

echo "[web] Applying Prisma schema..."
pnpm db:push

if [ "${COACH_WEB_RUNTIME_MODE:-dev}" = "prod" ]; then
	echo "[web] Building Astro app for production runtime..."
	pnpm build
	echo "[web] Starting Astro production server..."
	exec sh -c 'HOST=0.0.0.0 PORT=4321 node dist/server/entry.mjs'
fi

echo "[web] Starting Astro dev server..."
exec pnpm dev --host 0.0.0.0 --port 4321
