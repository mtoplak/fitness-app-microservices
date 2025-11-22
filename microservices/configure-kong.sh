#!/bin/bash

# Čekaj da Kong bude spreman
echo "Waiting for Kong to be ready..."
until curl -s http://localhost:8001 > /dev/null; do
  echo "Kong is not ready yet..."
  sleep 2
done

echo "Kong is ready! Configuring services..."

# Kreiraj service za User Service
# Na Linuxu koristimo host.docker.internal ili 172.17.0.1 (docker bridge)
curl -i -X POST http://localhost:8001/services/ \
  --data name=user-service \
  --data url=http://172.17.0.1:3001

# Kreiraj route za User Service
curl -i -X POST http://localhost:8001/services/user-service/routes \
  --data 'paths[]=/api/users' \
  --data name=user-service-route

echo ""
echo "Kong configuration completed!"
echo ""
echo "Available endpoints:"
echo "  - POST   http://localhost:9000/api/users/register"
echo "  - POST   http://localhost:9000/api/users/login"
echo "  - GET    http://localhost:9000/api/users/me (requires auth)"
echo ""
echo "Kong Admin API: http://localhost:8001"
echo "Kong Proxy: http://localhost:9000"
