#!/bin/sh
set -e

echo "Running Prisma DB push..."
npx prisma db push --skip-generate 2>/dev/null || bunx prisma db push --skip-generate

echo "Starting server..."
exec bun server.js