#!/bin/bash

# OCCM Chapter Management App - Deployment Script
# Run this on your VPS after pulling the latest code

set -e

echo "=== OCCM Deployment Script ==="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to app directory
APP_DIR="/var/www/occm-app"
cd $APP_DIR

echo -e "${YELLOW}Pulling latest code...${NC}"
git pull origin main

echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false

echo -e "${YELLOW}Building application...${NC}"
npm run build

echo -e "${YELLOW}Copying static files to standalone...${NC}"
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo -e "${YELLOW}Restarting PM2 process...${NC}"
pm2 restart occm-app || pm2 start ecosystem.config.js

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
pm2 status
