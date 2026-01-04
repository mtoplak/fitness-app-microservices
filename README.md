# 🏋️ Fitness App - Microservices Architecture

## 📁 Repository Structure
- `microservices/`: Microservices architecture with Kong Gateway
- `frontend/`: React (Vite) frontend application

---

## 🚀 Quick Start - Microservices

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- .NET 8.0 SDK (for C# services)

### Production Deployment

Start all services in production mode (no port exposure):

```bash
cd microservices
docker compose up -d
```

This starts:
- Kong Gateway (8000, 8001, 8443, 8444)
- Konga UI (1337)
- All 6 microservices (internal network only)
- MongoDB instances (7x)

**Access**: Only Kong Gateway ports are exposed. Services accessible via Kong at `http://localhost:8000/api/`

### Local/Dev Environment

Start services with all ports exposed for direct access:

```bash
cd microservices
docker compose -f docker-compose.dev.yml up -d
```

### 🌱 Seeding Test Data

After starting the services, seed the databases with test data:

```bash
cd microservices

# Seed all services (local, with MongoDB ports exposed)
./seed-all.sh

# Or seed individual services
cd user-service && npm run seed
cd subscription-service && npm run seed
cd trainer-booking-service && npm run seed
cd group-class-booking-service && npm run seed
cd workout-schedule-service && npm run seed
```

**Test Credentials after seeding:**
- Admin: `admin@wiifit.si` / `password123`
- Trainer: `ana.kovac@wiifit.si` / `password123`
- Member: `miha.novak0@example.com` / `password123`

---

## 🌐 Available Ports (Local/Dev Only)

### Microservices & Swagger Documentation

| Service | Port | Swagger URL | Framework |
|---------|------|-------------| -----------|
| User Service | 3001 | http://localhost:3001/api-docs | ExpressJS |
| Subscription Service | 3002 | http://localhost:3002/api-docs | .NET 8 |
| Trainer Booking Service | 3003 | http://localhost:3003/api-docs | .NET 8 |
| Workout Schedule Service | 3004 | http://localhost:3004/api-docs | NestJS |
| Group Class Booking Service | 3005 | http://localhost:3005/api-docs | NestJS |
| Admin Reporting Service | 3006 | http://localhost:3006/api-docs | NestJS |

### Infrastructure

| Service | Port(s) | URL |
|---------|---------|-----|
| Kong Gateway Proxy | 8000, 8443 | http://localhost:8000 |
| Kong Admin API | 8001, 8444 | http://localhost:8001 |
| Konga UI (prod only) | 1337 | http://localhost:1337 |
| PostgreSQL (dev only) | 5432 | localhost:5432 |
| RabbitMQ | 5672, 15672 | http://localhost:15672 (UI) |
| Logging Service | 3007 | http://localhost:3007 |

### MongoDB Instances (Local)

| Database | Port | Connection |
|----------|------|------------|
| User Service | 27017 | mongodb://admin:admin123@localhost:27017 |
| Group Bookings | 27018 | mongodb://admin:admin123@localhost:27018 |
| Subscriptions | 27019 | mongodb://admin:admin123@localhost:27019 |
| Reporting | 27020 | mongodb://admin:admin123@localhost:27020 |
| Trainer Bookings | 27021 | mongodb://admin:admin123@localhost:27021 |
| Workout Schedules | 27022 | mongodb://admin:admin123@localhost:27022 |
| Logging Service | 27020 | mongodb://mongodb-logs:27017 |

---

## 📊 RabbitMQ Logging System

The logging system uses RabbitMQ as a message broker for centralized log collection from all microservices.

### RabbitMQ Management UI

**URL**: http://localhost:15672  
**Username**: `fitness`  
**Password**: `fitness123`

### Logging Service Endpoints

**Port**: 3007

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/logs`  | Fetches all logs from RabbitMQ and saves them to MongoDB |
| GET    | `/logs/:dateFrom/:dateTo` | Retrieves logs between two dates (YYYY-MM-DD) |
| DELETE | `/logs`  | Deletes all logs from the database |
| GET    | `/health`| Health check |

### Usage

```bash
# Fetch logs from RabbitMQ to the database
curl -X POST http://localhost:3007/logs

# Retrieve logs for January 2026
curl http://localhost:3007/logs/2026-01-01/2026-01-31

# Delete all logs
curl -X DELETE http://localhost:3007/logs
```

### Implementation Files

**Express Services (user-service)**:
- `src/utils/logger.ts` - RabbitMQ logger
- `src/middleware/correlationId.middleware.ts` - Correlation ID
- `src/middleware/logging.middleware.ts` - Request/response logging
- `src/utils/serviceRequest.ts` - Inter-service communication

**NestJS Services (subscription, workout, group-class, admin)**:
- `src/services/logger.service.ts` - Logger service
- `src/middleware/correlation-id.middleware.ts` - Correlation ID
- `src/middleware/logging.middleware.ts` - Request logging

**.NET Services (subscription, trainer-booking)**:
- `Logging/RabbitMQLogger.cs` - Logger class
- `Middleware/CorrelationIdMiddleware.cs` - Correlation ID
- `Middleware/LoggingMiddleware.cs` - Request logging

### Correlation ID

Each request receives a unique UUID via the `X-Correlation-ID` header, enabling traceability of calls across all microservices.

---

## 🧪 Testing APIs

### Via Kong Gateway (Production)

All services are accessible through Kong at port 8000:

```bash
# Register user
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get profile (requires JWT token)
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Direct Service Access (Local/Dev Only)

When running local or dev compose files, access services directly:

```bash
# User Service
curl http://localhost:3001/health

# Subscription Service
curl http://localhost:3002/api/subscriptions
```

---

## 📦 Docker Compose Commands

### Production
```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild and start
docker compose up -d --build
```

### Dev Environment
```bash
# Start
docker compose -f docker-compose.dev.yml up -d

# Stop with volume cleanup
docker compose -f docker-compose.dev.yml down -v

# Check status
docker compose -f docker-compose.dev.yml ps
```

---

## 🔧 Configuration

### MongoDB Credentials (Local/Dev)
```
Username: admin
Password: admin123
Auth Database: admin
```


### Environment Variables

Each service can be configured via environment variables in the respective docker-compose file:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Service port
- `NODE_ENV` / `ASPNETCORE_ENVIRONMENT`: Environment mode

---

## 📚 Additional Documentation

- [Docker Compose Usage Guide](microservices/DOCKER_USAGE.md) - Detailed compose file documentation
- [Inter-Service Communication](microservices/INTER_SERVICE_COMMUNICATION.md) - Service mesh architecture
- Individual service READMEs in each service folder

---

## 🏗️ Architecture

### Microservices (6)
- **user-service** (Express): User authentication and management
- **subscription-service** (NestJS + C#): Subscription/membership management
- **trainer-booking-service** (C#): Personal trainer booking
- **workout-schedule-service** (NestJS): Workout scheduling
- **group-class-booking-service** (NestJS): Group fitness classes
- **admin-reporting-service** (NestJS): Admin dashboard and analytics

### API Gateway
- **Kong**: API Gateway with rate limiting, authentication, routing
- **Konga**: Kong admin UI (production only)

### Databases
- **PostgreSQL**: Kong configuration database
- **MongoDB**: 7 instances (1 per service + shared databases)

---

## 🎯 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:8080`

Configure API endpoint in `frontend/.env`:
```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

---