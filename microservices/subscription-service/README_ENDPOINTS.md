# Subscription Service

Mikroservis za upravljanje naročnin in plačil v fitness aplikaciji.

## Funkcionalnosti

### Osnovne funkcionalnosti
- ✅ **Upravljanje paketov** - prikaz, kreiranje, urejanje paketov naročnin
- ✅ **Nakup naročnine** - uporabniki lahko kupijo naročnino
- ✅ **Podaljševanje naročnine** - ročno podaljševanje obstoječe naročnine
- ✅ **Preklic naročnine** - preklic naročnine z razlogom
- ✅ **Reaktivacija** - ponovno aktiviranje prekinjene naročnine
- ✅ **Povijest plačil** - pregled vseh plačil uporabnika
- ✅ **Status preverjanje** - preverjanje statusa in preostalih dni naročnine
- ✅ **Avtomatsko označevanje** - cron job za označevanje potečenih naročnin

## API Endpoints

### 1. Paketi naročnin

#### Pridobi vse pakete
```bash
GET /plans?activeOnly=true
```

**Odgovor:**
```json
[
  {
    "id": "...",
    "name": "Basic Monthly",
    "description": "Access to gym facilities",
    "price": 29.99,
    "durationDays": 30,
    "accessLevel": 1,
    "isActive": true,
    "features": ["Gym access", "Locker room"]
  }
]
```

#### Pridobi posamezen paket
```bash
GET /plans/:id
```

#### Ustvari nov paket (admin)
```bash
POST /plans
Content-Type: application/json

{
  "name": "Premium Monthly",
  "description": "Full access with personal training",
  "price": 79.99,
  "durationDays": 30,
  "accessLevel": 2,
  "features": ["Gym access", "Group classes", "1 PT session/month"]
}
```

#### Posodobi paket (admin)
```bash
PUT /plans/:id
Content-Type: application/json

{
  "price": 69.99,
  "isActive": true
}
```

### 2. Naročnine

#### Nakup naročnine
```bash
POST /subscriptions
Content-Type: application/json

{
  "userId": "user123",
  "planId": "plan456",
  "paymentMethod": "credit_card"
}
```

**Odgovor:**
```json
{
  "id": "sub789",
  "userId": "user123",
  "planId": "plan456",
  "planName": "Basic Monthly",
  "status": "active",
  "startDate": "2025-11-23T00:00:00Z",
  "endDate": "2025-12-23T00:00:00Z",
  "autoRenew": true,
  "createdAt": "2025-11-23T10:00:00Z",
  "updatedAt": "2025-11-23T10:00:00Z"
}
```

#### Pridobi aktivno naročnino uporabnika
```bash
GET /subscriptions/user/:userId
```

#### Pridobi vse naročnine uporabnika
```bash
GET /subscriptions/user/:userId/all
```

#### Pridobi naročnino po ID
```bash
GET /subscriptions/:id
```

#### Podaljšanje naročnine
```bash
POST /subscriptions/:id/renew
Content-Type: application/json

{
  "paymentMethod": "credit_card"
}
```

#### Preklic naročnine
```bash
POST /subscriptions/:id/cancel
Content-Type: application/json

{
  "reason": "Moving to another city"
}
```

#### Reaktivacija naročnine
```bash
POST /subscriptions/:id/reactivate
```

**Opomba:** Reaktivacija je možna samo za prekinjene naročnine, ki še niso potekle.

#### Preveri status naročnine
```bash
GET /subscriptions/:id/status
```

**Odgovor:**
```json
{
  "status": "active",
  "isActive": true,
  "daysRemaining": 15,
  "expiresAt": "2025-12-23T00:00:00Z"
}
```

### 3. Zgodovina plačil

#### Zgodovina plačil uporabnika
```bash
GET /payments/user/:userId
```

**Odgovor:**
```json
[
  {
    "id": "pay123",
    "subscriptionId": "sub789",
    "amount": 29.99,
    "paymentMethod": "credit_card",
    "status": "completed",
    "transactionId": "TXN-1234567890-abc",
    "paymentDate": "2025-11-23T10:00:00Z"
  }
]
```

#### Zgodovina plačil za naročnino
```bash
GET /payments/subscription/:subscriptionId
```

### 4. Admin funkcionalnosti

#### Pridobi naročnine, ki kmalu potečejo
```bash
GET /admin/expiring-subscriptions?days=7
```

Pridobi vse aktivne naročnine, ki potečejo v naslednjih N dneh.

## Struktura podatkovne baze (MongoDB)

### SubscriptionPlan Collection
- `_id` - MongoDB ObjectId
- `name` - Ime paketa
- `description` - Opis paketa
- `price` - Cena
- `durationDays` - Trajanje v dnevih
- `accessLevel` - Nivo dostopa (1=basic, 2=premium, 3=vip)
- `isActive` - Ali je paket aktiven
- `features` - Seznam funkcionalnosti
- `createdAt`, `updatedAt` - Timestamps

### Subscription Collection
- `_id` - MongoDB ObjectId
- `userId` - ID uporabnika
- `planId` - Referenca na SubscriptionPlan
- `status` - Status (active, expired, cancelled, pending)
- `startDate` - Datum začetka
- `endDate` - Datum konca
- `autoRenew` - Avtomatsko podaljševanje
- `cancelledAt` - Datum preklica
- `cancelReason` - Razlog za preklic
- `lastRenewalDate` - Datum zadnjega podaljšanja
- `renewalCount` - Število podaljšanj
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `userId + status` - za hitro iskanje aktivnih naročnin
- `endDate + status` - za cron job potečenih naročnin

### Payment Collection
- `_id` - MongoDB ObjectId
- `subscriptionId` - Referenca na Subscription
- `userId` - ID uporabnika
- `amount` - Znesek
- `paymentMethod` - Način plačila
- `status` - Status (pending, completed, failed, refunded)
- `transactionId` - ID transakcije
- `paymentDate` - Datum plačila
- `failureReason` - Razlog za neuspeh
- `metadata` - Dodatni podatki
- `createdAt`, `updatedAt` - Timestamps

**Indexes:**
- `userId + paymentDate` - za zgodovino plačil
- `subscriptionId` - za plačila po naročnini

## Avtomatizacija

### Cron Jobs

**Označevanje potečenih naročnin** (vsak dan ob polnoči):
```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async markExpiredSubscriptions()
```

Avtomatsko označi vse naročnine, katerih `endDate` je pretekla, kot `expired`.

## Business Rules

1. **En uporabnik, ena aktivna naročnina** - uporabnik ne more imeti več aktivnih naročnin hkrati
2. **Preklic ne pomeni takojšnje ukinitve** - naročnina ostane aktivna do datuma `endDate`
3. **Reaktivacija samo za aktivne** - uporabnik lahko reaktivira samo prekinjeno naročnino, ki še ni potekla
4. **Podaljšanje podaljša od trenutnega konca** - če se naročnina podaljša pred potekom, se novi čas doda k obstoječemu
5. **Zgodovina plačil** - vsa plačila se beležijo za revizijo

## Okoljske spremenljivke

```env
MONGODB_URI=mongodb://mongodb-subscriptions:27017/fitness-subscriptions
NODE_ENV=development
PORT=3002
JWT_SECRET=your-secret-key-here
USER_SERVICE_URL=http://user-service:3001
```

## Namestitev in zagon

### Lokalni razvoj

1. Namesti odvisnosti:
```bash
npm install --legacy-peer-deps
```

2. Kopiraj `.env.example` v `.env`:
```bash
cp .env.example .env
```

3. Poženi aplikacijo:
```bash
npm run start:dev
```

### Docker

```bash
docker-compose up subscription-service
```

## Prihodnje nadgradnje

- 💳 **Integracija s plačilnimi vrati** - Stripe, PayPal
- 🔄 **Avtomatsko podaljševanje** - recurring payments
- 📧 **Email obvestila** - obvestila o poteku naročnine
- 💰 **Popusti in promocijske kode** - discount codes
- 📊 **Analitika** - revenue reports, churn rate
- 🎁 **Loyalty program** - rewards za dolgoletne stranke

## Tehnologije

- NestJS
- Mongoose
- MongoDB
- TypeScript
- Class Validator
- Schedule Module (Cron jobs)
