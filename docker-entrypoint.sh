#!/bin/sh
set -e

# Initialize database from pre-built copy only if volume is empty
if [ ! -f prisma/dev.db ]; then
  echo "Initializing database..."
  cp prisma-init/dev.db prisma/dev.db
fi

echo "Starting server..."
exec bun server.js