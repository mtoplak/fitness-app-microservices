# Admin Reporting Service

Admin reporting and analytics service for the fitness app. Provides reports, dashboard metrics, and admin-only analytics endpoints backed by MongoDB.

## Scenario: Admin Reporting Workflow

1. Admin opens the reports page in the frontend (`frontend/src/pages/dashboard/AdminReports.tsx`).
2. Frontend requests revenue and attendance reports with a date range:
   - `GET /reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
   - `GET /reports/attendance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
3. Service validates JWT and admin role.
4. Revenue report is fetched from Subscription Service via `SUBSCRIPTION_SERVICE_URL`.
5. Attendance report is aggregated (currently mocked; extend to call booking services).
6. Service returns data to the frontend and can persist reports with `POST /reports`.

## Scenario: Poročila in analitika (Admin Reports Page)

This scenario covers the admin page "Poročila in analitika" with the subtitle
"Pregled zaslužka, prihodkov in udeležbe" in `frontend/src/pages/dashboard/AdminReports.tsx`.

1. Admin opens the Admin Reports page.
2. Frontend loads reports for a date range (default last 3 months):
   - `GET /reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
   - `GET /reports/attendance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
3. Admin Reporting Service validates JWT and admin role.
4. Revenue report is fetched from Subscription Service and returned in the shape
   expected by the frontend charts.
5. Attendance report aggregates group class and personal training bookings:
   - group class bookings from Group Class Booking Service
   - trainer bookings from Trainer Booking Service
6. Service combines data into the payload required by `AdminReports.tsx`:
   - revenue summary, monthly series, package breakdown
   - attendance summary, per-class stats, daily attendance series
7. Frontend renders summary cards, charts, and tables. Admin can adjust the
   date range and refresh the data.

## Scenario: Upravljanje skupinskih vadb (Admin Classes Page)

This scenario covers the admin page "Upravljanje skupinskih vadb" in
`frontend/src/pages/dashboard/AdminClasses.tsx`.

Plan:
1. Define the Admin Classes API contract (list classes, create, update, cancel/delete).
2. Expose admin class-management endpoints in the Group Class Booking Service.
3. Wire admin-reporting (or gateway routing) to reach those endpoints with JWT/role checks.
4. Confirm the frontend form and table fields map to the backend DTOs.

## Scenario: Admin nadzorna plošča (Dashboard Overview)

This scenario covers the admin dashboard overview (summary KPIs).

1. Admin opens the dashboard.
2. Frontend requests summary KPIs:
   - `GET /dashboard`
3. Admin Reporting Service validates JWT and admin role.
4. Admin Reporting Service aggregates data from other services:
   - User Service for total user counts.
   - Subscription Service for revenue and active subscriptions.
   - Group Class + Trainer Booking Services for attendance totals (via internal report aggregation).
5. Admin Reporting Service returns a compact KPI payload to the frontend.

Service-to-service calls:
- **Admin Reporting Service → User Service**: `GET /api/admin/dashboard`
- **Admin Reporting Service → Subscription Service**: `GET /api/reports/revenue?startDate=...&endDate=...`
- **Admin Reporting Service → Group Class Booking Service**: `GET /api/reports/attendance?startDate=...&endDate=...`
- **Admin Reporting Service → Trainer Booking Service**: `GET /api/trainer-bookings/report?startDate=...&endDate=...`

## Scenario: Admin Dashboard Snapshot

1. Admin opens the dashboard in the frontend (statistics view).
2. Frontend requests dashboard data:
   - `GET /dashboard`
3. Service validates JWT and admin role.
4. Service gathers KPIs from dependent services:
   - Recent logs from Logging Service
   - Membership counts from User Service
   - Revenue summary from Subscription Service
   - Booking totals from Trainer/Group Class Booking Services
5. Service aggregates data into a dashboard snapshot payload.
6. Frontend renders summary cards and recent activity.

## Data Model

`Report` document stored in MongoDB:
- `title` (string, required)
- `type` (revenue | attendance | membership | activity)
- `description` (string)
- `startDate` (date, required)
- `endDate` (date, required)
- `data` (object)
- `generatedBy` (string)

## API Endpoints

All routes require admin JWT except the health check (`GET /`).

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Health check |
| POST | `/reports` | Create report |
| GET | `/reports` | List reports |
| GET | `/reports/:id` | Get report by id |
| PUT | `/reports/:id` | Update report |
| DELETE | `/reports/:id` | Delete report |
| GET | `/reports/revenue` | Revenue report (date range) |
| GET | `/reports/attendance` | Attendance report (date range) |
| GET | `/dashboard` | Dashboard summary |
| GET | `/stats/revenue` | Revenue stats (period=monthly) |
| GET | `/stats/attendance` | Attendance stats |
| GET | `/stats/clients` | Client overview |
| POST | `/export` | Export stub |
| PUT | `/settings` | Update settings stub |
| DELETE | `/cache` | Clear cache stub |

## Authentication

- JWT required for all endpoints except `GET /`.
- `RolesGuard` enforces `admin` role.

## Configuration

Environment variables:
- `MONGODB_URI` (default: `mongodb://localhost:27017/fitness-reporting-db`)
- `PORT` (default: 3006)
- `JWT_SECRET` (shared JWT secret)
- `SUBSCRIPTION_SERVICE_URL` (default: `http://subscription-service:3002`)
- `GROUP_CLASS_BOOKING_SERVICE_URL` (default: `http://group-class-booking-service:3005`)
- `TRAINER_BOOKING_SERVICE_URL` (default: `http://trainer-booking-service:3003`)
- `WORKOUT_SCHEDULE_SERVICE_URL` (default: `http://workout-schedule-service:3004`)
- `USER_SERVICE_URL` (default: `http://user-service:3001`)

## Local Development

```bash
npm install
npm run start:dev
```

For full stack instructions, see the repository root README.

## Example Requests

```bash
# Health check
curl http://localhost:3006/

# Revenue report (admin JWT required)
curl -H "Authorization: Bearer <ADMIN_JWT>" \
  "http://localhost:3006/reports/revenue?startDate=2024-01-01&endDate=2024-03-31"
```
