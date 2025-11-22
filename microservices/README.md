# 🏋️ Fitness App - Development Setup

## 🚀 Quick Start (Local Development)

### 1. Pokreni infrastrukturu (Kong + MongoDB)

```bash
cd /home/docker/soa/fitness-app/microservices
docker-compose -f docker-compose.dev.yml up -d
```

Ovo pokreće:
- Kong Gateway (ports: 8000, 8001, 8002)
- PostgreSQL za Kong (port: 5432)
- MongoDB za User Service (port: 27017)

### 2. Konfiguriši Kong Gateway

```bash
./configure-kong.sh
```

### 3. Pokreni User Service lokalno

```bash
cd user-service
npm run start:dev
```

User Service će se pokrenuti na `http://localhost:3001`

---

## 🧪 Testiranje API-ja

### Registracija novog korisnika

```bash
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Odgovor će sadržati JWT token.

### Pregled profila (zahteva autentifikaciju)

```bash
curl -X GET http://localhost:8000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🌐 Dostupni Portovi

| Servis | Port | URL |
|--------|------|-----|
| Kong Proxy | 8000 | http://localhost:8000 |
| Kong Admin API | 8001 | http://localhost:8001 |
| MongoDB (Users) | 27017 | localhost:27017 |
| User Service | 3001 | http://localhost:3001 |

---

## 📦 Komande

**Zaustavi servise:**
```bash
docker-compose -f docker-compose.dev.yml down
```

**Pregled logova:**
```bash
docker-compose -f docker-compose.dev.yml logs -f
```
