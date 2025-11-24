# Group Class Booking Service

Mikroservis za upravljanje prijav na skupinske vadbe v fitness aplikaciji.

## Funkcionalnosti

### Osnovne funkcionalnosti
- ✅ **Prijava na skupinsko vadbo** - uporabniki se lahko prijavijo na razpoložljive skupinske vadbe
- ✅ **Odjava od vadbe** - uporabniki lahko odpovejo svojo rezervacijo
- ✅ **Preverjanje kapacitete** - avtomatično preverjanje razpoložljivih mest
- ✅ **Seznam udeležencev** - trenerji lahko vidijo seznam prijavljenih uporabnikov
- ✅ **Seznam rezervacij** - uporabniki lahko vidijo vse svoje rezervacije

### API Endpoints

#### 1. Prijava na skupinsko vadbo
```bash
POST /bookings
Content-Type: application/json

{
  "userId": "uuid",
  "classId": "uuid"
}
```

**Odgovor:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "classId": "uuid",
  "status": "confirmed",
  "bookedAt": "2025-11-23T10:00:00Z",
  "className": "Yoga",
  "classSchedule": "2025-11-25T18:00:00Z",
  "classCapacity": 20,
  "currentParticipants": 15
}
```

#### 2. Odjava od vadbe
```bash
DELETE /bookings/:id
```

**Odgovor:**
```json
{
  "message": "Booking cancelled successfully"
}
```

#### 3. Seznam rezervacij uporabnika
```bash
GET /bookings?userId=uuid
```

**Odgovor:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "classId": "uuid",
    "status": "confirmed",
    "bookedAt": "2025-11-23T10:00:00Z",
    "className": "Yoga",
    "classSchedule": "2025-11-25T18:00:00Z"
  }
]
```

#### 4. Seznam udeležencev (za trenerja)
```bash
GET /classes/:classId/participants
```

**Odgovor:**
```json
[
  {
    "userId": "uuid",
    "bookedAt": "2025-11-23T10:00:00Z",
    "status": "confirmed"
  }
]
```

#### 5. Preverjanje razpoložljivosti
```bash
GET /classes/:classId/availability
```

**Odgovor:**
```json
{
  "available": true,
  "capacity": 20,
  "currentParticipants": 15,
  "remainingSpots": 5
}
```

#### 6. Seznam prihodnjih vadb
```bash
GET /classes
```

**Odgovor:**
```json
[
  {
    "id": "uuid",
    "name": "Yoga",
    "description": "Relaxing yoga session",
    "trainerId": "uuid",
    "scheduledAt": "2025-11-25T18:00:00Z",
    "duration": 60,
    "capacity": 20,
    "currentParticipants": 15,
    "availableSpots": 5,
    "status": "active"
  }
]
```

## Struktura podatkovne baze (MongoDB)

### Booking Collection
- `_id` - MongoDB ObjectId (primary key)
- `userId` - ID uporabnika
- `classId` - ObjectId skupinske vadbe (referenca na GroupClass)
- `status` - Status rezervacije (confirmed, cancelled, waitlist)
- `bookedAt` - Čas rezervacije
- `cancelledAt` - Čas odpovedi (nullable)
- `reminderSent` - Ali je bilo poslano opomnik
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

### GroupClass Collection
- `_id` - MongoDB ObjectId (primary key)
- `name` - Ime vadbe
- `description` - Opis vadbe
- `trainerId` - ID trenerja
- `scheduledAt` - Čas vadbe
- `duration` - Trajanje v minutah
- `capacity` - Maksimalna kapaciteta
- `currentParticipants` - Trenutno število udeležencev
- `status` - Status vadbe (active, cancelled, completed)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

## Namestitev in zagon

### Lokalni razvoj

1. Namesti odvisnosti:
```bash
npm install
```

2. Kopiraj `.env.example` v `.env` in prilagodi nastavitve:
```bash
cp .env.example .env
```

3. Poženi aplikacijo:
```bash
npm run start:dev
```

### Docker

Servis je že konfiguriran v `docker-compose.yml` glavnega projekta.

```bash
docker-compose up group-class-booking-service
```

## Okoljske spremenljivke

```env
MONGODB_URI=mongodb://mongodb-group-bookings:27017/fitness-group-bookings
NODE_ENV=development
PORT=3005
JWT_SECRET=your-secret-key-here
USER_SERVICE_URL=http://user-service:3001
WORKOUT_SCHEDULE_SERVICE_URL=http://workout-schedule-service:3004
SUBSCRIPTION_SERVICE_URL=http://subscription-service:3002
```

## Prihodnje nadgradnje

- 🔔 **Obvestila in opomniki** - avtomatska obvestila pred vadbo
- 📧 **Email notifications** - email potrditve in opomniki
- 🔄 **Waitlist sistem** - čakalna lista za polne vadbe
- 📊 **Statistika** - analitika o obisku vadb
- ⏰ **Časovna omejitev** - možnost odpovedi samo do določenega časa pred vadbo

## Tehnologije

- NestJS
- Mongoose
- MongoDB
- TypeScript
- Class Validator
