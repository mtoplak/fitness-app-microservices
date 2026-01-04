#!/bin/bash

echo "🏋️  Fitness App - Development Environment Startup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker compose -f docker-compose.dev.yml down

echo ""
echo -e "${YELLOW}🏗️  Starting services...${NC}"
echo "   This may take a few minutes on first run..."
echo ""

# Start services
docker compose -f docker-compose.dev.yml up -d

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"

# Wait for Kong to be ready
echo "   Waiting for Kong Gateway..."
until docker exec kong-gateway kong health &> /dev/null; do
    echo -n "."
    sleep 2
done
echo -e "${GREEN} Ready!${NC}"

# Wait for User Service to be ready
echo "   Waiting for User Service..."
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e "${GREEN} Ready!${NC}"

echo ""
echo -e "${YELLOW}⚙️  Configuring Kong Gateway...${NC}"
sleep 3

# Run Kong setup to configure routes
if [ -f "./update-kong-services.sh" ]; then
    ./update-kong-services.sh
else
    ./kong-setup.sh
fi

echo ""
echo -e "${GREEN}✅ All services are up and running!${NC}"
echo ""
echo "=============================================="
echo -e "${GREEN}🌐 Access URLs:${NC}"
echo ""
echo "   📡 Kong Proxy (Main API):    http://localhost:8000"
echo "   🔧 Kong Admin API:           http://localhost:8001"
echo "   🎨 Frontend:                 http://localhost:8080"
echo "   📊 RabbitMQ Management:      http://localhost:15672 (fitness/fitness123)"
echo ""
echo -e "${GREEN}📋 API Endpoints:${NC}"
echo ""
echo "   👤 User Service:             http://localhost:8000/api/users"
echo "   💳 Subscription Service:     http://localhost:8000/api/subscriptions"
echo "   🏋️  Trainer Booking:          http://localhost:8000/api/trainers"
echo "   📅 Workout Schedule:         http://localhost:8000/api/schedules"
echo "   👥 Group Class Booking:      http://localhost:8000/api/classes"
echo "   📊 Admin Reporting:          http://localhost:8000/api/admin"
echo "   📝 Logging Service:          http://localhost:3007/logs"
echo ""
echo "=============================================="
echo -e "${YELLOW}🧪 Quick Test:${NC}"
echo ""
echo "   Login:"
echo "   curl -X POST http://localhost:8000/api/users/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@wiifit.si\",\"password\":\"password123\"}'"
echo ""
echo "=============================================="
echo -e "${GREEN}📚 View logs:${NC}"
echo ""
echo "   All services:     docker compose -f docker-compose.dev.yml logs -f"
echo "   User Service:     docker logs -f user-service"
echo "   Kong:             docker logs -f kong-gateway"
echo "   Logging Service:  docker logs -f logging-service"
echo ""
echo -e "${GREEN}🛑 Stop all services:${NC}"
echo ""
echo "   docker compose -f docker-compose.dev.yml down"
echo ""
echo "=============================================="
