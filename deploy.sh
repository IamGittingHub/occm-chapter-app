#!/bin/bash
set -e

echo "=== Deploying OCCM App to VPS ==="

# Config
VPS_USER="root"
VPS_HOST="srv1165028.hstgr.cloud"
APP_DIR="/var/www/occm-app"

# Build locally (already done, but ensure it's fresh)
echo "Building..."
npm run build

# Create standalone package
echo "Preparing standalone package..."
rm -rf deploy-package
mkdir -p deploy-package

# Copy standalone server (including hidden .next folder)
cp -r .next/standalone/. deploy-package/

# Copy static assets INTO the .next folder
cp -r .next/static deploy-package/.next/

# Copy public folder
cp -r public deploy-package/

# Sync to VPS (exclude .env to preserve server config)
echo "Syncing to VPS..."
rsync -avz --delete --exclude='.env' deploy-package/ ${VPS_USER}@${VPS_HOST}:${APP_DIR}/

# Restart PM2 on VPS (port 3002)
echo "Restarting app on VPS..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${APP_DIR} && pm2 delete occm-app 2>/dev/null || true; PORT=3002 pm2 start server.js --name occm-app --update-env && pm2 save"

echo "=== Deploy Complete ==="
