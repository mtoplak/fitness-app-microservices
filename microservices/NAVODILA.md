# Navodila za dodajanje novih mikroservisov

## Pregled arhitekture

Trenutno imamo postavljen sistem z naslednjimi komponentami:
- **Kong Gateway** (API Gateway) - teče na portu 8000
- **User Service** - teče lokalno na portu 3001
- **MongoDB** - ločene instance za vsak mikroservis
- **PostgreSQL** - za Kong konfiguracijo

## Kako dodati nov mikroservis

### 1. Kreiranje NestJS projekta

```bash
cd /home/docker/soa/fitness-app/microservices
nest new [ime-servisa]
# Primer: nest new subscription-service
```

### 2. Izbira porta

Vsak mikroservis mora imeti svoj port:
- User Service: **3001**
- Subscription Service: **3002**
- Trainer Booking Service: **3003**
- Workout Schedule Service: **3004**
- Group Class Booking Service: **3005**
- Admin Reporting Service: **3006**

### 3. Instalacija potrebnih paketov

```bash
cd [ime-servisa]
npm install @nestjs/mongoose mongoose
npm install @nestjs/config
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcryptjs class-validator class-transformer
npm install --save-dev @types/bcryptjs @types/passport-jwt
```

### 4. Konfiguracija servisa

#### 4.1 Kreiraj `.env` datoteko

```bash
# V direktoriju servisa
cat > .env << EOF
PORT=300X  # Tvoj dodeleni port
MONGODB_URI=mongodb://admin:admin123@localhost:2701X/ime_baze?authSource=admin
JWT_SECRET=tvoj-super-tajni-kljuc-123456
JWT_EXPIRATION=7d
EOF
```

#### 4.2 Posodobi `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Omogoči CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Omogoči validacijo
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`[Ime Servisa] is running on: http://localhost:${port}`);
}
bootstrap();
```

#### 4.3 Konfiguriraj `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Tvoji moduli
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### 5. Dodajanje MongoDB instance v Docker Compose

Uredi `docker-compose.dev.yml`:

```yaml
  # MongoDB za [Ime Servisa]
  mongo-[ime]:
    image: mongo:7
    container_name: mongo-[ime]
    ports:
      - "2701X:27017"  # X = številka servisa
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: fitness_[ime]
    volumes:
      - mongo-[ime]-data:/data/db
    networks:
      - fitness-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  # ... obstoječi volumni
  mongo-[ime]-data:
```

Zaženi MongoDB:

```bash
docker compose -f docker-compose.dev.yml up -d mongo-[ime]
```

### 6. Registracija servisa v Kong Gateway

#### 6.1 Kreiranje Kong Service

```bash
curl -i -X POST http://localhost:8001/services \
  --data name=[ime-servisa] \
  --data url=http://localhost:300X
```

Primer:
```bash
curl -i -X POST http://localhost:8001/services \
  --data name=subscription-service \
  --data url=http://localhost:3002
```

#### 6.2 Kreiranje Kong Route

```bash
curl -i -X POST http://localhost:8001/services/[ime-servisa]/routes \
  --data name=[ime-servisa]-route \
  --data 'paths[]=/api' \
  --data strip_path=true
```

**POMEMBNO**: Route mora biti `/api` z `strip_path=true`, da Kong pravilno odstrani prefix in posreduje `/[controller-path]` tvojemu servisu.

Primer za subscription servis z kontrolerjem `@Controller('subscriptions')`:
```bash
curl -i -X POST http://localhost:8001/services/subscription-service/routes \
  --data name=subscription-route \
  --data 'paths[]=/api' \
  --data strip_path=true
```

Nato bo `http://localhost:8000/api/subscriptions/...` delovalo pravilno.

### 7. Zagon servisa

```bash
cd /home/docker/soa/fitness-app/microservices/[ime-servisa]
npm run start:dev
```

### 8. Testiranje

#### Lokalno (direktno na servis)
```bash
curl http://localhost:300X/[endpoint]
```

#### Skozi Kong Gateway (lokalno)
```bash
curl http://localhost:8000/api/[controller-path]/[endpoint]
```

#### Eksterno (iz Postmana)
```
http://88.198.106.21:8000/api/[controller-path]/[endpoint]
```

## Primeri kontrolerjev inRoutePaths

### Pravilna struktura

```typescript
// V kontrolerju
@Controller('subscriptions')  // ← To je path do kontrolerja
export class SubscriptionController {
  
  @Post('register')  // ← Endpoint: /subscriptions/register
  async register() { }
  
  @Get(':id')  // ← Endpoint: /subscriptions/:id
  async getById() { }
}
```

S Kong konfiguracijo `/api` + `strip_path=true`:
- Zahtevek: `http://88.198.106.21:8000/api/subscriptions/register`
- Kong odstrani `/api`, posreduje: `/subscriptions/register`
- NestJS prejme: `/subscriptions/register` ✅

## Pregled portov

| Servis | Port | MongoDB Port | Status |
|--------|------|--------------|--------|
| User Service | 3001 | 27017 | ✅ Implementiran |
| Subscription Service | 3002 | 27018 | ⏳ Čaka na implementacijo |
| Trainer Booking Service | 3003 | 27019 | ⏳ Čaka na implementacijo |
| Workout Schedule Service | 3004 | 27020 | ⏳ Čaka na implementacijo |
| Group Class Booking Service | 3005 | 27021 | ⏳ Čaka na implementacijo |
| Admin Reporting Service | 3006 | 27022 | ⏳ Čaka na implementacijo |
| Kong Gateway | 8000 | - | ✅ Teče |
| Kong Admin API | 8001 | - | ✅ Teče |

## Debugging

### Preveri, ali servis teče
```bash
curl http://localhost:300X/health
```

### Preveri Kong servise
```bash
curl http://localhost:8001/services
```

### Preveri Kong route
```bash
curl http://localhost:8001/routes
```

### Preveri, ali Kong doseže tvoj servis
```bash
curl -v http://localhost:8000/api/[controller-path]/[endpoint]
```

### Preveri MongoDB povezavo
```bash
docker exec -it mongo-[ime] mongosh -u admin -p admin123 --authenticationDatabase admin
```

## Pogosta vprašanja

### Q: Dobim 404 error pri klicu preko Konga?
**A:** Preveri:
1. Ali je `strip_path=true` nastavljen na route
2. Ali je Kong route path nastavljen na `/api`
3. Ali kontroler uporablja pravilen `@Controller('[pot]')`
4. Testiraj direktno na servis (brez Konga) - če dela, problem je v Kong konfiguraciji

### Q: Servis ne more dostopati do MongoDB?
**A:** Preveri:
1. Ali MongoDB container teče: `docker ps | grep mongo`
2. Ali je port pravilno mapiran v `docker-compose.dev.yml`
3. Ali je `MONGODB_URI` v `.env` pravilen
4. Testiraj povezavo: `docker exec -it mongo-[ime] mongosh`

### Q: Kong ne more doseči mojega servisa?
**A:** 
- Kong uporablja `network_mode: host`, kar pomeni da mora servis teči na **localhost**
- Preveri, ali servis res teče: `curl localhost:300X`
- Kong service URL mora biti `http://localhost:300X` (brez containernih imen!)

## Koristni ukazi

### Restart vseh Docker containerjev
```bash
cd /home/docker/soa/fitness-app/microservices
docker compose -f docker-compose.dev.yml restart
```

### Oglej si logove Kong Gateway
```bash
docker logs kong-gateway -f
```

### Posodobi Kong service URL
```bash
curl -i -X PATCH http://localhost:8001/services/[ime-servisa] \
  --data url=http://localhost:300X
```

### Posodobi Kong route
```bash
curl -i -X PATCH http://localhost:8001/routes/[ime-route] \
  --data 'paths[]=/api' \
  --data strip_path=true
```

### Izbriši Kong service (če si nekaj narobe naredil)
```bash
# Najprej poišči ID
curl http://localhost:8001/services

# Potem zbriši
curl -i -X DELETE http://localhost:8001/services/[service-id]
```

## Naslednji koraki

1. **Subscription Service**: Implementiraj membership pakete in naročnine
2. **Trainer Booking Service**: Rezervacije treningov s trenerji
3. **Workout Schedule Service**: Urniki in treningi članov
4. **Group Class Booking Service**: Rezervacije skupinskih vadb
5. **Admin Reporting Service**: Statistike in poročila za admin

Vsak servis naj sledi isti strukturi kot User Service za konsistentnost!
