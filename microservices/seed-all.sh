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
    
    # Seed Subscription Service (C# service - run locally)
    echo "2️⃣  Seeding Subscription Service..."
    cd subscription-service && MONGODB_URI="mongodb://admin:admin123@localhost:27019/fitness-subscriptions?authSource=admin" npx tsx scripts/seed.ts && cd ..
    
    # Seed Trainer Booking Service (C# service - run locally)
    echo "3️⃣  Seeding Trainer Booking Service..."
    cd trainer-booking-service && MONGODB_URI="mongodb://admin:admin123@localhost:27020/fitness_trainer_bookings?authSource=admin" npx tsx scripts/seed.ts && cd ..
    
    # Seed Group Class Booking Service
    echo "4️⃣  Seeding Group Class Booking Service..."
    docker compose -f docker-compose.dev.yml exec group-class-booking-service npx tsx src/scripts/seed.ts
    
    # Seed Workout Schedule Service
    echo "5️⃣  Seeding Workout Schedule Service..."
    docker compose -f docker-compose.dev.yml exec workout-schedule-service npx tsx src/scripts/seed.ts
    
else
    echo -e "${YELLOW}Running locally (make sure MongoDB is accessible)...${NC}"
    echo ""
    
    # Seed User Service first (other services depend on user IDs)
    echo "1️⃣  Seeding User Service..."
    cd user-service && npx tsx src/scripts/seed.ts && cd ..
    
    # Wait a bit for data to be available
    sleep 2
    
    # Seed Subscription Service (C#)
    echo "2️⃣  Seeding Subscription Service..."
    cd subscription-service && MONGODB_URI="mongodb://admin:admin123@localhost:27019/fitness-subscriptions?authSource=admin" npx tsx scripts/seed.ts && cd ..
    
    # Seed Trainer Booking Service (C#)
    echo "3️⃣  Seeding Trainer Booking Service..."
    cd trainer-booking-service && MONGODB_URI="mongodb://admin:admin123@localhost:27020/fitness_trainer_bookings?authSource=admin" npx tsx scripts/seed.ts && cd ..
    
    # Seed Group Class Booking Service
    echo "4️⃣  Seeding Group Class Booking Service..."
    cd group-class-booking-service && npx tsx src/scripts/seed.ts && cd ..
    
    # Seed Workout Schedule Service
    echo "5️⃣  Seeding Workout Schedule Service..."
    cd workout-schedule-service && npx tsx src/scripts/seed.ts && cd ..
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
