# SmartCondo API (implemented MVP slice)

Base path: `/api/v1`. JSON requests and responses use UTF-8. A protected request sends `Authorization: Bearer <accessToken>`. Success responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code": ..., "message": ... } }`.

## Authentication and administration

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API and PostgreSQL readiness |
| POST | `/auth/login` | Public | Email/password login; returns access and refresh tokens |
| POST | `/auth/refresh` | Public | Rotates a refresh token and issues a new access token |
| POST | `/auth/logout` | Authenticated | Revokes the account's active refresh tokens |
| GET / POST | `/organizations` | `organization:read` / `organization:manage` | List scoped organizations / create organization (system admin only) |
| GET / POST | `/users` | `user:manage` | List scoped accounts / create an account and scoped role assignment |
| PATCH | `/users/:id/status` | `user:manage` | Activate, lock, or disable a scoped account |

The initial system administrator is created by the one-time `db:bootstrap-admin` command using environment variables. There is no public account-registration endpoint.

## Property and people

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET / POST | `/buildings` | `building:read` / `building:manage` | List scoped buildings / create within an assigned organization |
| POST | `/buildings/:buildingId/blocks` | `building:manage` | Add a block |
| POST | `/blocks/:blockId/floors` | `building:manage` | Add a floor |
| GET / POST | `/apartments` | `apartment:read` / `apartment:manage` | List paginated scoped apartments / add an apartment to a scoped floor |
| GET / POST | `/apartments/:apartmentId/owners` | `people:read` / `people:manage` | Read or add time-bound ownership shares |
| GET / POST | `/apartments/:apartmentId/residents` | `people:read` / `people:manage` | Read or add time-bound residency and bill-consent rules |
| POST | `/apartments/:apartmentId/owners/:ownershipId/end` | `people:manage` | End an active ownership record |
| POST | `/apartments/:apartmentId/residents/:residencyId/end` | `people:manage` | End an active residency record |

Owner and resident accounts are linked to a person record by email. Their apartment access is derived from current ownership/residency records; staff organization/building scopes are checked in SQL on the server.

## Utilities, billing and payments

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET / POST | `/utility-readings` | `utility:read` / `utility:manage` | Read scoped meter history / record non-decreasing meter readings |
| GET / POST | `/fee-types` | `billing:read` / `billing:manage` | List or configure building fee rules |
| POST | `/billing-periods` | `billing:manage` | Create a draft billing period |
| POST | `/billing-periods/:periodId/generate` | `billing:manage` | Generate one invoice per active apartment from configured fees and readings |
| POST | `/billing-periods/:periodId/issue` | `billing:manage` | Issue generated invoices |
| GET | `/invoices` | `billing:read` | List scoped invoices with paid and outstanding amounts |
| POST | `/payments` | `payment:record` | Record a partial or full payment; resident portal method is simulated only |

Invoice generation is transactional and refuses to proceed when a required utility reading is missing or a fee requires manual input. Payment recording locks the invoice, checks the outstanding balance, and supports an idempotency key per invoice.

## Operations and reporting

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET / POST | `/maintenance-requests` | `maintenance:read` / `maintenance:submit` | Read scoped requests / submit for an accessible apartment |
| PATCH | `/maintenance-requests/:requestId` | `maintenance:manage` | Advance an allowed status transition and/or assign a technician in the same building |
| GET | `/notifications` | `notification:read` | Read notifications addressed to the current account |
| POST | `/notifications` | `notification:manage` | Publish a building notice and create recipients from current ownership/residency |
| POST | `/notifications/:notificationId/read` | `notification:read` | Mark the current account's notice as read |
| GET | `/dashboard/summary` | `dashboard:read` | Return aggregate apartment, billing, maintenance, and utility metrics for assigned buildings |

Vehicle, access-control, board-approval, real payment-provider, AI, IoT, advanced analytics, and web portal APIs are not part of this implementation slice.
