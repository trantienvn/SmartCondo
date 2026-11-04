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

Các lệnh dưới đây chạy trong **PowerShell tại thư mục gốc repository**. Project local sử dụng tên Compose `smartcondo-local` và file cấu hình `.env.smartcondo.local` để tránh đụng vào `.env` khác.

### 1. Tạo cấu hình Docker lần đầu

Nếu đã có `.env.smartcondo.local`, hãy giữ nguyên và chuyển sang bước 2. Nếu chưa có, tạo file với mật khẩu PostgreSQL và JWT secret ngẫu nhiên:

```powershell
$dbBytes = [byte[]]::new(32)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($dbBytes) } finally { $rng.Dispose() }
$dbPassword = [Convert]::ToBase64String($dbBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

$jwtBytes = [byte[]]::new(48)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($jwtBytes) } finally { $rng.Dispose() }
$jwtSecret = [Convert]::ToBase64String($jwtBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

@"
POSTGRES_USER=smartcondo
POSTGRES_PASSWORD=$dbPassword
POSTGRES_DB=smartcondo
DATABASE_URL=postgresql://smartcondo:$dbPassword@localhost:5432/smartcondo
DATABASE_URL_DOCKER=postgresql://smartcondo:$dbPassword@db:5432/smartcondo
JWT_ACCESS_SECRET=$jwtSecret
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
API_BASE_PATH=/api/v1
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
"@ | Set-Content -Encoding ascii .env.smartcondo.local
```

File `.env.smartcondo.local` đã được Git ignore. Không commit file này hoặc chia sẻ các giá trị bí mật trong đó.

### 2. Khởi chạy ứng dụng

Mở Docker Desktop, chờ Docker Engine hoạt động, rồi chạy:

```powershell
docker compose --project-name smartcondo-local --env-file .env.smartcondo.local up --build -d
docker compose --project-name smartcondo-local --env-file .env.smartcondo.local ps
```

Chờ service `db` có trạng thái `healthy`. Kiểm tra API kết nối database và web trả HTTP 200:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
(Invoke-WebRequest -UseBasicParsing http://localhost:8080).StatusCode
```

Mở portal tại [http://localhost:8080](http://localhost:8080). API được publish tại `http://localhost:3000/api/v1`; PostgreSQL chỉ lắng nghe local tại `localhost:5432`.

### 3. Tạo tài khoản demo cho tất cả role

Lệnh seed tạo một tổ chức, một tòa nhà, block A, tầng 1, hai căn hộ và một tài khoản cho mỗi role trong RBAC. Lệnh cần được bật tường minh bằng `SEED_DEMO=true`; mật khẩu demo được tạo ngẫu nhiên và chỉ truyền tạm thời vào container:

```powershell
$demoBytes = [byte[]]::new(24)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($demoBytes) } finally { $rng.Dispose() }
$demoPassword = [Convert]::ToBase64String($demoBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
Write-Host "Mật khẩu dùng cho các tài khoản mới: $demoPassword"

docker compose --project-name smartcondo-local --env-file .env.smartcondo.local `
  exec -T -e SEED_DEMO=true -e "SEED_DEMO_PASSWORD=$demoPassword" `
  api node dist/db/seed-demo.js
```

Lưu lại mật khẩu vừa in ra để đăng nhập. Các tài khoản mới dùng chung mật khẩu này:

| Role | Email đăng nhập | Phạm vi demo |
|---|---|---|
| `SUPER_ADMIN` | `superadmin@smartcondo.local` | Toàn hệ thống |
| `ORG_ADMIN` | `orgadmin@smartcondo.local` | Tổ chức demo |
| `BUILDING_MANAGER` | `manager@smartcondo.local` | Tòa nhà demo |
| `MANAGEMENT_STAFF` | `staff@smartcondo.local` | Tòa nhà demo |
| `ACCOUNTANT` | `accountant@smartcondo.local` | Tòa nhà demo |
| `TECHNICIAN` | `technician@smartcondo.local` | Tòa nhà demo |
| `SECURITY` | `security@smartcondo.local` | Tòa nhà demo |
| `BOARD_MEMBER` | `board@smartcondo.local` | Tòa nhà demo, quyền giám sát theo role |
| `OWNER` | `owner@smartcondo.local` | Chủ sở hữu căn `A-101` |
| `RESIDENT` | `resident@smartcondo.local` | Người thuê căn `A-102`, được xem và thanh toán hóa đơn |

Hệ thống hiện chưa định nghĩa role `GUEST`; tài khoản khách/cư dân dùng role `RESIDENT`. Tài khoản `admin@smartcondo.local` được tạo trước đó bằng bootstrap là tài khoản riêng, lệnh seed không sửa hoặc thay thế nó.

### 4. Đăng nhập và kiểm tra tài khoản

Đăng nhập trên portal bằng một email trong bảng và mật khẩu ở bước 3. Có thể kiểm tra API login bằng PowerShell:

```powershell
$email = 'superadmin@smartcondo.local'
$loginBody = @{ email = $email; password = $demoPassword } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/login' `
  -Method Post -ContentType 'application/json' -Body $loginBody
$login.data.user
$login.data.scopes
```

Nếu đã đóng PowerShell sau khi seed, nhập lại **mật khẩu đã lưu** vào `$demoPassword` trước khi chạy đoạn kiểm tra. Để xác nhận scope cư dân/chủ hộ, đăng nhập bằng `resident@smartcondo.local` hoặc `owner@smartcondo.local`; cư dân chỉ thấy `A-102`, chủ hộ chỉ thấy `A-101`.

### 5. Chạy seed lại hoặc dừng ứng dụng

Seed chạy lặp an toàn: không nhân bản tổ chức/tòa/căn hộ, role assignment hay quan hệ chủ sở hữu/cư trú. Lệnh cũng **không đặt lại mật khẩu** tài khoản đã tồn tại. Khi chạy lại trong phiên PowerShell hiện tại, dùng lại `$demoPassword`; nếu đã mất mật khẩu của tài khoản đã seed, chạy seed với mật khẩu mới sẽ không đổi được mật khẩu cũ.

Dừng các container nhưng giữ nguyên dữ liệu database:

```powershell
docker compose --project-name smartcondo-local --env-file .env.smartcondo.local stop
```

Khởi động lại stack đã tạo:

```powershell
docker compose --project-name smartcondo-local --env-file .env.smartcondo.local start
```

### Tạo tài khoản quản trị đầu tiên bằng bootstrap

Nếu chỉ cần tài khoản quản trị hệ thống ban đầu thay vì toàn bộ dữ liệu demo, đặt tạm `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` trong env rồi chạy:

```powershell
$bootstrapBytes = [byte[]]::new(24)
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bootstrapBytes) } finally { $rng.Dispose() }
$bootstrapPassword = [Convert]::ToBase64String($bootstrapBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
Write-Host "Lưu mật khẩu bootstrap này: $bootstrapPassword"

docker compose --project-name smartcondo-local --env-file .env.smartcondo.local `
  exec -T -e BOOTSTRAP_ADMIN_EMAIL=admin@example.local `
  -e BOOTSTRAP_ADMIN_NAME='System Administrator' `
  -e "BOOTSTRAP_ADMIN_PASSWORD=$bootstrapPassword" `
  api node dist/db/bootstrap-admin.js
```

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
