#!/bin/bash

# Configuration
APP_DIR="/home/munaim/srv/apps/accred-ai"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Redeploying All Services ===${NC}"

# Navigate to app directory
cd "$APP_DIR" || { echo "Failed to change directory to $APP_DIR"; exit 1; }

# 1. Stop all services
echo -e "${BLUE}Stopping all services...${NC}"
docker compose down

# 2. Rebuild everything without cache
echo -e "${BLUE}Rebuilding all services...${NC}"
docker compose build --no-cache

# 3. Start everything in background
echo -e "${BLUE}Starting all services...${NC}"
docker compose up -d

# 4. Show status
echo -e "${BLUE}Checking status...${NC}"
docker compose ps

echo -e "${GREEN}=== Full Redeployment Complete ===${NC}"
echo -e "You can follow logs with: docker compose logs -f"
