# SmartCondo MVP API

The current implementation is a modular TypeScript/Express REST API backed by PostgreSQL. Authentication and authorization are checked by the API; UI visibility is not treated as an access control boundary.

## Requirements

- Node.js 22 or newer
- PostgreSQL 15 or newer
- A random `JWT_ACCESS_SECRET` with at least 32 characters

## Local setup

1. Copy `.env.example` to `.env` and set local values. Keep `.env` out of source control.
2. Install packages with `npm ci`.
3. Create the database named in `DATABASE_URL`.
4. Apply SQL migrations with `npm run db:migrate`.
5. Create the first system administrator once using `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD`, then run `npm run db:bootstrap-admin`. Remove the bootstrap credentials from the environment after use.
6. Start the API with `npm run dev` or build and run with `npm start`.

`GET /api/v1/health` reports API and database readiness. Protected routes use a bearer access token returned by `POST /api/v1/auth/login`. Browser origins are restricted by the comma-separated `ALLOWED_ORIGINS` setting.

## Docker

Copy `.env.example` to `.env`, set a local database password, a matching `DATABASE_URL_DOCKER`, and a random JWT secret, then run `docker compose up --build`. The web portal is served at `http://localhost:8080`; Nginx routes `/api/v1` to the API. The API applies migrations at container startup. For one-time provisioning, temporarily set the three `BOOTSTRAP_ADMIN_*` variables and run `docker compose exec api node dist/db/bootstrap-admin.js`, then remove those values from `.env`.

## Initial endpoints

- `POST /api/v1/auth/login`, `/refresh`, `/logout`
- `GET /api/v1/organizations`, `POST /api/v1/organizations`
- `GET|POST /api/v1/buildings`
- `POST /api/v1/buildings/:buildingId/blocks`
- `POST /api/v1/blocks/:blockId/floors`
- `GET|POST /api/v1/apartments`
- `GET|POST /api/v1/apartments/:apartmentId/owners|residents`
- `GET|POST /api/v1/utility-readings`, `/fee-types`, `/billing-periods`
- `POST /api/v1/billing-periods/:periodId/generate|issue`
- `GET /api/v1/invoices`, `POST /api/v1/payments`
- `GET|POST|PATCH /api/v1/maintenance-requests`
- `GET|POST /api/v1/notifications`, `POST /api/v1/notifications/:notificationId/read`
- `GET|POST /api/v1/users`, `PATCH /api/v1/users/:id/status`

Role assignments carry organization or building scope. Owner and resident accounts reach apartment data through active ownership and residency records. Residents can see or pay bills only when the ownership or residency relationship grants those capabilities. Payments are simulated for the MVP. Real payment-provider integration, vehicle controls, analytics, and IoT remain outside this slice.
