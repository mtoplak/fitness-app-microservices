#!/bin/bash

# Microservices Seed Script
# Seeds all microservices with test data

set -e

echo "🌱 Seeding all microservices with test data..."
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running with Docker or locally
if [ "$1" == "--docker" ]; then
    echo -e "${YELLOW}Running with Docker containers...${NC}"
    echo ""
    
    # Seed User Service
    echo "1️⃣  Seeding User Service..."
    docker compose -f docker-compose.dev.yml exec user-service npx tsx src/scripts/seed.ts
    
    # Wait a bit for data to be available
    sleep 2
    
    # Seed Subscription Service (C# - run inside container)
    echo "2️⃣  Seeding Subscription Service..."
    docker compose -f docker-compose.dev.yml exec -e MONGODB_URI="mongodb://admin:admin123@mongo-subscriptions:27017/fitness_subscriptions?authSource=admin" subscription-service dotnet run --project /src/scripts/Seed.csproj
    
    # Seed Trainer Booking Service (C# - run inside container)
    echo "3️⃣  Seeding Trainer Booking Service..."
    docker compose -f docker-compose.dev.yml exec -e MONGODB_URI="mongodb://admin:admin123@mongo-trainer-bookings:27017/fitness_trainer_bookings?authSource=admin" trainer-booking-service dotnet run --project /src/scripts/Seed.csproj
    
    # Seed Group Class Booking Service
    echo "4️⃣  Seeding Group Class Booking Service..."
    docker compose -f docker-compose.dev.yml exec \
      -e USER_SERVICE_MONGODB_URI="mongodb://admin:admin123@mongo-users:27017/fitness_users?authSource=admin" \
      group-class-booking-service npx tsx src/scripts/seed.ts
    
    # Seed Workout Schedule Service
    echo "5️⃣  Seeding Workout Schedule Service..."
    docker compose -f docker-compose.dev.yml exec \
      -e USER_SERVICE_MONGODB_URI="mongodb://admin:admin123@mongo-users:27017/fitness_users?authSource=admin" \
      workout-schedule-service npx tsx src/scripts/seed.ts
    
else
    echo -e "${YELLOW}Running locally (make sure MongoDB is accessible)...${NC}"
    echo ""
    
    # Seed User Service first (other services depend on user IDs)
    echo "1️⃣  Seeding User Service..."
    cd user-service && npx tsx src/scripts/seed.ts && cd ..
    
    # Wait a bit for data to be available
    sleep 2
    
    # Seed Subscription Service (C# - requires .NET SDK locally)
    echo "2️⃣  Seeding Subscription Service..."
    if command -v dotnet &> /dev/null; then
        cd subscription-service/scripts && MONGODB_URI="mongodb://admin:admin123@localhost:27019/fitness_subscriptions?authSource=admin" dotnet run && cd ../..
    else
        echo -e "${YELLOW}⚠️  Skipping: dotnet not installed. Run with --docker flag to seed C# services in containers.${NC}"
    fi
    
    # Seed Trainer Booking Service (C# - requires .NET SDK locally)
    echo "3️⃣  Seeding Trainer Booking Service..."
    if command -v dotnet &> /dev/null; then
        cd trainer-booking-service/scripts && MONGODB_URI="mongodb://admin:admin123@localhost:27020/fitness_trainer_bookings?authSource=admin" dotnet run && cd ../..
    else
        echo -e "${YELLOW}⚠️  Skipping: dotnet not installed. Run with --docker flag to seed C# services in containers.${NC}"
    fi
    
    # Seed Group Class Booking Service
    echo "4️⃣  Seeding Group Class Booking Service..."
    cd group-class-booking-service && USER_SERVICE_MONGODB_URI="mongodb://admin:admin123@localhost:27017/fitness_users?authSource=admin" npx tsx src/scripts/seed.ts && cd ..
    
    # Seed Workout Schedule Service
    echo "5️⃣  Seeding Workout Schedule Service..."
    cd workout-schedule-service && USER_SERVICE_MONGODB_URI="mongodb://admin:admin123@localhost:27017/fitness_users?authSource=admin" npx tsx src/scripts/seed.ts && cd ..
fi

echo ""
echo -e "${GREEN}=============================================="
echo "✅ All services seeded successfully!"
echo "=============================================="
echo ""
echo "Test credentials:"
echo "  Admin:   admin@wiifit.si / password123"
echo "  Trainer: ana.kovac@wiifit.si / password123"
echo "  Member:  miha.novak0@example.com / password123"
echo "${NC}"
