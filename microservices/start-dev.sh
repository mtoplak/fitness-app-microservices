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
echo -e "${YELLOW}⚙️  Configuring Kong Gateway routes...${NC}"
sleep 3

KONG_ADMIN="http://localhost:8001"

# Delete all existing routes
for route_id in $(curl -s $KONG_ADMIN/routes 2>/dev/null | jq -r '.data[]?.id' 2>/dev/null); do
  curl -s -X DELETE "$KONG_ADMIN/routes/$route_id" > /dev/null 2>&1
done

# Create routes
curl -s -X POST "$KONG_ADMIN/services/user-service/routes" \
  --data "name=user-routes" \
  --data "paths[]=/api/users" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/user-service/routes" \
  --data "name=user-admin-routes" \
  --data "paths[]=/api/admin/members" \
  --data "paths[]=/api/admin/trainers" \
  --data "paths[]=/api/admin/users" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/subscription-service/routes" \
  --data "name=subscription-routes" \
  --data "paths[]=/api/subscriptions" \
  --data "paths[]=/api/memberships" \
  --data "paths[]=/api/packages" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/trainer-booking-service/routes" \
  --data "name=trainer-booking-routes" \
  --data "paths[]=/api/trainers" \
  --data "paths[]=/api/trainer-bookings" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/workout-schedule-service/routes" \
  --data "name=workout-schedule-routes" \
  --data "paths[]=/api/workout-schedules" \
  --data "paths[]=/api/schedules" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/group-class-booking-service/routes" \
  --data "name=group-class-booking-routes" \
  --data "paths[]=/api/classes" \
  --data "paths[]=/api/class-bookings" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/admin-reporting-service/routes" \
  --data "name=admin-reporting-routes" \
  --data "paths[]=/api/reports" \
  --data "paths[]=/api/admin/dashboard" \
  --data "paths[]=/api/admin/stats" \
  --data "paths[]=/api/admin/export" \
  --data "strip_path=false" > /dev/null

echo -e "${GREEN}✅ Kong routes configured${NC}"

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
