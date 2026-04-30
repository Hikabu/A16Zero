#!/bin/sh
echo "Running Prisma migrate..."
npx prisma migrate deploy

echo "Starting app..."
node dist/main.js