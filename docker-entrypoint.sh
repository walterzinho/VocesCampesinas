#!/bin/sh
set -e

# Initialize database only if it doesn't exist
if [ ! -f prisma/dev.db ]; then
  echo "Initializing database..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
fi

echo "Starting server..."
exec bun server.js