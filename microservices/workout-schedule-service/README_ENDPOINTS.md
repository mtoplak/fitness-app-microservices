# Workout Schedule Service

Mikroservis za upravljanje urnika skupinskih vadb v fitness aplikaciji.

## Funkcionalnosti

### Osnovne funkcionalnosti
- ✅ **Prikaz urnika** - prikaz vseh odobrenih terminov skupinskih vadb
- ✅ **Filtriranje** - po trenerju, datumu, tipu vadbe
- ✅ **Kreiranje terminov** - admin lahko direktno kreira termine
- ✅ **Predlaganje terminov** - trenerji lahko predlagajo nove termine
- ✅ **Preverjanje prekrivanja** - avtomatično preverjanje konfliktov med termini
- ✅ **Odobritev/Zavrnitev** - admin lahko odobri ali zavrne predlagane termine
- ✅ **Urejanje terminov** - posodabljanje obstoječih terminov
- ✅ **Brisanje terminov** - brisanje terminov brez udeležencev
- ✅ **Preklicanje terminov** - soft delete za termine z udeleženci

## API Endpoints

### 1. Prikaz urnika
```bash
GET /schedules?trainerId=xxx&from=2025-11-25&to=2025-12-01&type=yoga
```

**Odgovor:**
```json
[
  {
    "id": "...",
    "name": "Morning Yoga",
    "description": "Relaxing yoga session",
    "trainerId": "trainer123",
    "scheduledAt": "2025-11-25T09:00:00Z",
    "duration": 60,
    "capacity": 20,
    "currentParticipants": 15,
    "type": "yoga",
    "status": "active",
    "approvalStatus": "approved",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 2. Pridobi posamezen termin
```bash
GET /schedules/:id
```

### 3. Admin kreira nov termin (direktno odobreno)
```bash
POST /schedules
Content-Type: application/json

{
  "name": "Evening Pilates",
  "description": "Core strength workout",
  "trainerId": "trainer123",
  "scheduledAt": "2025-11-26T18:00:00Z",
  "duration": 60,
  "capacity": 15,
  "type": "pilates"
}
```

### 4. Trener predlaga nov termin (čaka na odobritev)
```bash
POST /schedules/propose
Content-Type: application/json

{
  "name": "Weekend Spinning",
  "description": "High intensity cardio",
  "trainerId": "trainer123",
  "scheduledAt": "2025-11-30T10:00:00Z",
  "duration": 45,
  "capacity": 20,
  "type": "spinning",
  "notes": "Popular time slot for weekend warriors"
}
```

### 5. Preveri prekrivanje terminov
```bash
POST /schedules/check-conflict
Content-Type: application/json

{
  "trainerId": "trainer123",
  "scheduledAt": "2025-11-26T18:00:00Z",
  "duration": 60,
  "excludeId": "existing-schedule-id" // optional
}
```

**Odgovor:**
```json
{
  "hasConflict": false,
  "conflictingSchedules": []
}
```

### 6. Pridobi termine čakajoče na odobritev (admin)
```bash
GET /schedules/pending/list
```

### 7. Odobri predlagani termin (admin)
```bash
POST /schedules/:id/approve
Content-Type: application/json

{
  "approvedBy": "admin123"
}
```

### 8. Zavrni predlagani termin (admin)
```bash
POST /schedules/:id/reject
Content-Type: application/json

{
  "rejectedBy": "admin123",
  "reason": "Time slot already too crowded"
}
```

### 9. Uredi termin
```bash
PUT /schedules/:id
Content-Type: application/json

{
  "name": "Updated Class Name",
  "capacity": 25
}
```

### 10. Izbriši termin
```bash
DELETE /schedules/:id
```

**Omejitev:** Ne more izbrisati termina z aktivnimi udeleženci.

### 11. Prekliči termin (soft delete)
```bash
POST /schedules/:id/cancel
```

## Struktura podatkovne baze (MongoDB)

### WorkoutSchedule Collection
- `_id` - MongoDB ObjectId (primary key)
- `name` - Ime vadbe
- `description` - Opis vadbe
- `trainerId` - ID trenerja
- `scheduledAt` - Datum in čas vadbe
- `duration` - Trajanje v minutah
- `capacity` - Maksimalna kapaciteta
- `currentParticipants` - Trenutno število udeležencev
- `type` - Tip vadbe (yoga, pilates, spinning, zumba, etc.)
- `status` - Status vadbe (active, cancelled, completed)
- `approvalStatus` - Status odobritve (pending, approved, rejected)
- `notes` - Opombe za odobritev/zavrnitev
- `proposedBy` - ID uporabnika, ki je predlagal termin
- `approvedAt` - Čas odobritve
- `approvedBy` - ID admina, ki je odobril
- `rejectedAt` - Čas zavrnitve
- `rejectedBy` - ID admina, ki je zavrnil
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

### Indexes
- `scheduledAt + trainerId` - za hitro preverjanje prekrivanja
- `approvalStatus` - za filtriranje pending terminov

## Preverjanje prekrivanja

Servis avtomatično preverja prekrivanje terminov za istega trenerja:
- Pri kreiranju novega termina
- Pri odobritvi predlaganega termina
- Pri urejanju obstoječega termina (če se spremeni čas)

**Algoritem:**
1. Izračuna začetni in končni čas novega termina
2. Preveri vse aktivne termine istega trenerja
3. Zazna prekrivanje če:
   - Nov termin se začne med obstoječim terminom
   - Nov termin se konča med obstoječim terminom
   - Obstoječ termin se začne ali konča med novim terminom

## Potek odobritve

1. **Trener predlaga termin** → status: `pending`
2. **Admin pregleda** → lahko odobri ali zavrne
3. **Odobritev** → status: `approved`, termin postane viden v urniku
4. **Zavrnitev** → status: `rejected`, trener lahko vidi razlog

## Okoljske spremenljivke

```env
MONGODB_URI=mongodb://mongodb-workout-schedules:27017/fitness-workout-schedules
NODE_ENV=development
PORT=3004
JWT_SECRET=your-secret-key-here
USER_SERVICE_URL=http://user-service:3001
GROUP_CLASS_BOOKING_SERVICE_URL=http://group-class-booking-service:3005
```

## Namestitev in zagon

### Lokalni razvoj

1. Namesti odvisnosti:
```bash
npm install --legacy-peer-deps
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
docker-compose up workout-schedule-service
```

## Tehnologije

- NestJS
- Mongoose
- MongoDB
- TypeScript
- Class Validator
- Class Transformer

## Prihodnje nadgradnje

- 📧 **Email obvestila** - obvestila trenerjem o odobritvi/zavrnitvi
- 📊 **Statistika** - analitika obiskanosti različnih tipov vadb
- 🔄 **Recurring schedules** - ponavljajoči se termini
- 📱 **Push notifications** - obvestila o novih terminih
- 🎯 **Predloge terminov** - AI-powered priporočila za optimalne termine
