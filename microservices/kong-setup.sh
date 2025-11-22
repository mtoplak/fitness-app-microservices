#!/bin/bash

# Kong Admin API URL
KONG_ADMIN_URL="http://localhost:8001"

echo "🚀 Konfiguracija Kong Gateway za Fitness App mikroservise..."
echo ""

# ========== USER SERVICE ==========
echo "📝 Kreiram User Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=user-service \
  --data url='http://user-service:3001'

echo "📝 Dodajem rute za User Service..."
curl -i -X POST $KONG_ADMIN_URL/services/user-service/routes \
  --data 'paths[]=/api/users' \
  --data name=user-routes

# ========== SUBSCRIPTION SERVICE ==========
echo ""
echo "📝 Kreiram Subscription Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=subscription-service \
  --data url='http://subscription-service:3002'

echo "📝 Dodajem rute za Subscription Service..."
curl -i -X POST $KONG_ADMIN_URL/services/subscription-service/routes \
  --data 'paths[]=/api/subscriptions' \
  --data 'paths[]=/api/memberships' \
  --data 'paths[]=/api/packages' \
  --data name=subscription-routes

# ========== TRAINER BOOKING SERVICE ==========
echo ""
echo "📝 Kreiram Trainer Booking Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=trainer-booking-service \
  --data url='http://trainer-booking-service:3003'

echo "📝 Dodajem rute za Trainer Booking Service..."
curl -i -X POST $KONG_ADMIN_URL/services/trainer-booking-service/routes \
  --data 'paths[]=/api/trainers' \
  --data 'paths[]=/api/trainer-bookings' \
  --data name=trainer-booking-routes

# ========== WORKOUT SCHEDULE SERVICE ==========
echo ""
echo "📝 Kreiram Workout Schedule Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=workout-schedule-service \
  --data url='http://workout-schedule-service:3004'

echo "📝 Dodajem rute za Workout Schedule Service..."
curl -i -X POST $KONG_ADMIN_URL/services/workout-schedule-service/routes \
  --data 'paths[]=/api/workout-schedules' \
  --data 'paths[]=/api/schedules' \
  --data name=workout-schedule-routes

# ========== GROUP CLASS BOOKING SERVICE ==========
echo ""
echo "📝 Kreiram Group Class Booking Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=group-class-booking-service \
  --data url='http://group-class-booking-service:3005'

echo "📝 Dodajem rute za Group Class Booking Service..."
curl -i -X POST $KONG_ADMIN_URL/services/group-class-booking-service/routes \
  --data 'paths[]=/api/classes' \
  --data 'paths[]=/api/class-bookings' \
  --data name=group-class-booking-routes

# ========== ADMIN REPORTING SERVICE ==========
echo ""
echo "📝 Kreiram Admin Reporting Service..."
curl -i -X POST $KONG_ADMIN_URL/services/ \
  --data name=admin-reporting-service \
  --data url='http://admin-reporting-service:3006'

echo "📝 Dodajem rute za Admin Reporting Service..."
curl -i -X POST $KONG_ADMIN_URL/services/admin-reporting-service/routes \
  --data 'paths[]=/api/admin' \
  --data 'paths[]=/api/reports' \
  --data name=admin-reporting-routes

# ========== PLUGINS ==========
echo ""
echo "🔌 Dodajem plugine..."

# CORS plugin za sve servise
echo "📝 Dodajem CORS plugin..."
curl -i -X POST $KONG_ADMIN_URL/plugins/ \
  --data name=cors \
  --data config.origins=* \
  --data config.methods=GET \
  --data config.methods=POST \
  --data config.methods=PUT \
  --data config.methods=DELETE \
  --data config.methods=OPTIONS \
  --data config.headers=Accept \
  --data config.headers=Authorization \
  --data config.headers=Content-Type \
  --data config.exposed_headers=Authorization \
  --data config.credentials=true \
  --data config.max_age=3600

# Rate limiting za sve servise
echo "📝 Dodajem Rate Limiting plugin..."
curl -i -X POST $KONG_ADMIN_URL/plugins/ \
  --data name=rate-limiting \
  --data config.minute=100 \
  --data config.policy=local

echo ""
echo "✅ Kong Gateway je uspešno konfigurisan!"
echo ""
echo "🌐 Dostupne URL adrese:"
echo "   - Kong Proxy: http://localhost:8000"
echo "   - Kong Admin: http://localhost:8001"
echo "   - Konga UI: http://localhost:1337"
echo ""
echo "📋 Primer API poziva:"
echo "   curl http://localhost:8000/api/users"
echo "   curl -X POST http://localhost:8000/api/users/register"
echo ""
