#!/bin/bash

# Configuration
APP_DIR="/home/munaim/srv/apps/accred-ai"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Redeploying Backend & Infrastructure ===${NC}"

# Navigate to app directory
cd "$APP_DIR" || { echo "Failed to change directory to $APP_DIR"; exit 1; }

# 1. Stop backend and related services
echo -e "${BLUE}Stopping backend services...${NC}"
docker compose stop backend worker celery-beat

# 2. Rebuild backend without cache to ensure latest code/deps
echo -e "${BLUE}Rebuilding backend...${NC}"
docker compose build --no-cache backend

# 3. Start services in background
echo -e "${BLUE}Starting backend services...${NC}"
docker compose up -d backend worker celery-beat

# 4. Show status
echo -e "${BLUE}Checking status...${NC}"
docker compose ps | grep -E "backend|worker|celery"

echo -e "${GREEN}=== Backend Redeployment Complete ===${NC}"
echo -e "You can follow logs with: docker compose logs -f backend"
