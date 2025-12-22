#!/bin/bash

# AccrediFy Development Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting AccrediFy Development Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "\n${GREEN}Starting Django Backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run migrations if needed
python manage.py migrate --run-syncdb

# Start backend server in background
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "\n${GREEN}Starting React Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Start frontend server
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}=============================================="
echo -e "AccrediFy is running!"
echo -e "=============================================="
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC}"
echo -e "Backend API: ${YELLOW}http://localhost:8000/api${NC}"
echo -e "Django Admin: ${YELLOW}http://localhost:8000/admin${NC}"
echo -e ""
echo -e "Press ${RED}Ctrl+C${NC} to stop both servers"
echo -e "==============================================${NC}\n"

# Wait for both processes
wait
