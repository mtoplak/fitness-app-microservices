#!/bin/bash

echo "🏋️  Fitness App - Microservices Startup Script"
echo "=============================================="
echo ""

# Boje za output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Provera Docker-a
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Provera Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Zaustavljanje postojećih containera
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}🏗️  Building and starting services...${NC}"
echo "   This may take a few minutes on first run..."
echo ""

# Pokretanje servisa
docker-compose up -d --build

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"

# Čekanje da Kong bude spreman
echo "   Waiting for Kong Gateway..."
until docker-compose exec -T kong kong health &> /dev/null; do
    echo -n "."
    sleep 2
done
echo -e "${GREEN} Ready!${NC}"

# Čekanje da User Service bude spreman
echo "   Waiting for User Service..."
until docker-compose exec -T user-service wget --spider -q http://localhost:3001/health &> /dev/null; do
    echo -n "."
    sleep 2
done
echo -e "${GREEN} Ready!${NC}"

echo ""
echo -e "${YELLOW}⚙️  Configuring Kong Gateway...${NC}"
sleep 3
./kong-setup.sh

echo ""
echo -e "${GREEN}✅ All services are up and running!${NC}"
echo ""
echo "=============================================="
echo -e "${GREEN}🌐 Access URLs:${NC}"
echo ""
echo "   📡 Kong Proxy (Main API):    http://localhost:8000"
echo "   🔧 Kong Admin API:           http://localhost:8001"
echo "   🎨 Konga UI Dashboard:       http://localhost:1337"
echo ""
echo -e "${GREEN}📋 API Endpoints:${NC}"
echo ""
echo "   👤 User Service:             http://localhost:8000/api/users"
echo "   💳 Subscription Service:     http://localhost:8000/api/subscriptions"
echo "   🏋️  Trainer Booking:          http://localhost:8000/api/trainers"
echo "   📅 Workout Schedule:         http://localhost:8000/api/schedules"
echo "   👥 Group Class Booking:      http://localhost:8000/api/classes"
echo "   📊 Admin Reporting:          http://localhost:8000/api/admin"
echo ""
echo "=============================================="
echo -e "${YELLOW}🧪 Quick Test:${NC}"
echo ""
echo "   Register a user:"
echo "   curl -X POST http://localhost:8000/api/users/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@test.com\",\"password\":\"test123\",\"fullName\":\"Test User\"}'"
echo ""
echo "=============================================="
echo -e "${GREEN}📚 View logs:${NC}"
echo ""
echo "   All services:     docker-compose logs -f"
echo "   User Service:     docker-compose logs -f user-service"
echo "   Kong:             docker-compose logs -f kong"
echo ""
echo -e "${GREEN}🛑 Stop all services:${NC}"
echo ""
echo "   docker-compose down"
echo ""
echo "=============================================="
