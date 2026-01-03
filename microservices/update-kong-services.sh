#!/bin/bash

KONG_ADMIN_URL="http://localhost:8001"

echo "🔄 Updating Kong services to use Docker network names..."

# Update each service
services=(
  "user-service:3001"
  "subscription-service:3002"
  "trainer-booking-service:3003"
  "workout-schedule-service:3004"
  "group-class-booking-service:3005"
  "admin-reporting-service:3006"
)

for service in "${services[@]}"; do
  name="${service%%:*}"
  url="http://${service}"
  
  echo "📝 Updating $name to $url..."
  curl -s -X PATCH "$KONG_ADMIN_URL/services/$name" \
    --data "url=$url" | jq -r '.name, .host, .port' || echo "Failed"
  echo ""
done

echo "✅ Kong services updated!"
