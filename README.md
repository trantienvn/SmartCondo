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

## Docker & Khởi Chạy Hệ Thống

Cấu hình môi trường đã được hợp nhất tại file `.env` (mẫu tham khảo tại `.env.example`).

### 1. Cấu hình Môi trường
Copy file mẫu `.env.example` thành `.env` (nếu chưa có):
```powershell
Copy-Item .env.example .env
```

### 2. Khởi chạy ứng dụng bằng Docker Compose
Mở Docker Desktop, chờ Docker Engine hoạt động, rồi chạy:

```powershell
docker compose up --build -d
docker compose ps
```

Chờ service `db` có trạng thái `healthy`. Kiểm tra API kết nối database và web trả HTTP 200:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
(Invoke-WebRequest -UseBasicParsing http://localhost:8080).StatusCode
```

Mở portal tại [http://localhost:8080](http://localhost:8080). API được publish tại `http://localhost:3000/api/v1`; PostgreSQL chỉ lắng nghe local tại `localhost:5432`.

### 3. Nạp dữ liệu demo cho tất cả role

Lệnh seed tạo tổ chức, tòa nhà, căn hộ, biểu phí, số điện nước và các tài khoản demo:

```powershell
docker compose exec -T api npm run db:seed
```

Lưu ý: Bạn cũng có thể dùng nút **"1-Click Demo Seeder"** ngay tại màn hình đăng nhập của ứng dụng web.

### 4. Dừng hoặc khởi động lại ứng dụng

Dừng các container nhưng giữ nguyên dữ liệu database:
```powershell
docker compose stop
```

Khởi động lại stack đã tạo:
```powershell
docker compose start
```

### 5. Backend Mockup PHP (Không cần Docker / PostgreSQL)
Nếu muốn test demo Frontend nhanh mà không cần Docker hay PostgreSQL, bạn có thể chạy Mockup Backend bằng PHP:
```powershell
npm run mock:php
```
Server PHP sẽ lắng nghe tại `http://127.0.0.1:3000` với đầy đủ API và dữ liệu mẫu giống hệt bản Node.js.

Giá trị truyền bằng `exec -e` chỉ tồn tại trong lệnh đó; không ghi mật khẩu thật vào tài liệu hoặc commit vào repository.

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
