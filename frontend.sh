#!/bin/bash

# Configuration
APP_DIR="/home/munaim/srv/apps/accred-ai"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Redeploying Frontend ===${NC}"

# Navigate to app directory
cd "$APP_DIR" || { echo "Failed to change directory to $APP_DIR"; exit 1; }

# 1. Stop frontend service
echo -e "${BLUE}Stopping frontend service...${NC}"
docker compose stop frontend

# 2. Rebuild frontend without cache
echo -e "${BLUE}Rebuilding frontend...${NC}"
docker compose build --no-cache frontend

# 3. Start frontend in background
echo -e "${BLUE}Starting frontend service...${NC}"
docker compose up -d frontend

# 4. Show status
echo -e "${BLUE}Checking status...${NC}"
docker compose ps | grep frontend

echo -e "${GREEN}=== Frontend Redeployment Complete ===${NC}"
echo -e "You can follow logs with: docker compose logs -f frontend"
