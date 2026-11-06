# Open Issues & Decision Log

## ISSUE-001: Technology stack is not formally confirmed

- **Status:** RESOLVED AS BASELINE
- **Priority:** HIGH
- **Resolution:** Thống nhất sử dụng baseline công nghệ cho giai đoạn MVP: Backend Node.js + Express 5 + TypeScript, Database PostgreSQL 15+, Frontend React 19 + TypeScript + Vite. Các công nghệ nâng cao (IoT Gateway, Kafka, InfluxDB, Kubernetes) được dời sang Giai đoạn 4 và 5 theo Roadmap.

## ISSUE-002: Existing API contract is not consistent with the MVP authorization and data model

- **Status:** RESOLVED
- **Priority:** HIGH
- **Resolution:** Đã tái cấu trúc toàn diện mô hình dữ liệu trong `migrations/001_initial_schema.sql` và tài liệu `docs/erd.md`: tách bạch bảng nhân thân `people`, sở hữu theo tỷ lệ và thời hạn `apartment_ownerships`, quan hệ cư trú và ủy quyền hóa đơn `apartment_residencies`. Đồng thời các API route đã bổ sung kiểm tra Building Scoping và quyền sở hữu phía server.

## ISSUE-003: Payment integrations and MVP payment behavior are undefined

- **Status:** CLARIFIED FOR MVP
- **Priority:** MEDIUM
- **Observed:** SRS excludes real payment integrations absent provider credentials, while demo scenarios describe simulated payment.
- **Resolution:** Giai đoạn MVP triển khai thanh toán mô phỏng (Simulated Payment) và ghi nhận thanh toán tiền mặt/chuyển khoản thủ công qua Ban quản lý. Cung cấp cơ chế `Idempotency-Key` và khóa hàng để đảm bảo toàn vẹn dữ liệu. Tích hợp cổng thanh toán trực tuyến thật (VNPay, VietQR, MoMo) được dời sang Giai đoạn 4 khi có thông tin credentials chính thức.

## ISSUE-004: Docker/PostgreSQL runtime was unavailable

- **Status:** RESOLVED (2026-11-03)
- **Priority:** MEDIUM
- **Resolution:** Installed the official WSL component required by Docker Desktop, started Docker Engine 29.8.2, built API and web images, and launched PostgreSQL 17, API, and Nginx web containers. All three SQL migrations are recorded in the live PostgreSQL container; API health is healthy directly and through Nginx, and the administrator login succeeds.
- **Runtime:** Compose project `smartcondo-local`; services are bound to localhost on ports 5432, 3000, and 8080. Cấu hình môi trường đã được hợp nhất tại file chuẩn `.env` (mẫu tham khảo tại `.env.example`), loại bỏ file phân mảnh `.env.smartcondo.local`.

## ISSUE-005: Mockup Backend phục vụ kiểm thử Demo FE độc lập không phụ thuộc DB
- **Status:** RESOLVED
- **Priority:** MEDIUM
- **Resolution:** Xây dựng hệ thống Mockup Backend bằng PHP thuần tại thư mục `mock/` (`mock/server.php`, `mock/data.php`, `mock/test.php`, `mock/README.md`). Khởi chạy bằng `npm run mock:php` (hoặc `php -S 127.0.0.1:3000 mock/server.php`). Trùng khớp 100% endpoint với Node.js production backend, lưu trữ trạng thái động trong `mock/store.json`, dữ liệu tường minh dễ đọc và có thể nạp lại tức thì qua `POST /api/v1/demo/seed`.
