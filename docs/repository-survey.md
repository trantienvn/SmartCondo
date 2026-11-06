# Báo cáo Khảo sát Repository - SmartCondo

**Ngày cập nhật:** 03/11/2026  
**Người thực hiện:** AI Software Architect & Senior Full-stack Developer  
**Dự án:** Smart Apartment & Condominium Digital Management Platform (SmartCondo)

---

## 1. Mục tiêu Khảo sát

Khảo sát hiện trạng repository nhằm:
- Đánh giá mã nguồn, cấu hình và tài liệu đặc tả nghiệp vụ đã có.
- Đối chiếu yêu cầu trong `docs/SRS.md` với hiện trạng triển khai.
- Xác định các thành phần đã hoàn thành, đang triển khai, còn thiếu hoặc rủi ro kỹ thuật.
- Thiết lập baseline chuẩn cho các giai đoạn phát triển tiếp theo.

---

## 2. Cấu trúc Thư mục Hiện tại

```text
SmartCondo/
├── .agents/                      # Quy tắc và skills cho multi-agent coordination
│   └── skills/project-orchestrator/
├── context/                      # Lưu trữ bộ nhớ ngữ cảnh và trạng thái phối hợp liên tác tử
│   ├── agent-locks/              # Khóa độc quyền khi agent claim task
│   ├── contracts/                # Thỏa thuận giao diện API & Data model dùng chung
│   ├── sessions/                 # Nhật ký từng phiên làm việc
│   ├── architecture.md           # Thiết kế kiến trúc tổng thể
│   ├── erd-design.md             # Thiết kế mô hình dữ liệu ban đầu
│   ├── permission-matrix.md      # Thiết kế ma trận phân quyền
│   ├── progress.md               # Nhật ký tiến độ
│   ├── requirements-analysis.md  # Phân tích chi tiết yêu cầu SRS
│   ├── roadmap.md                # Lộ trình triển khai dự án
│   └── task-board.md             # Bảng theo dõi task chi tiết
├── docs/                         # Tài liệu đặc tả chính thức của dự án
│   ├── SRS.md                    # Software Requirements Specification gốc
│   ├── api.md                    # Đặc tả API HTTP v1
│   └── issues.md                 # Nhật ký vấn đề kỹ thuật và điểm cần chốt
├── migrations/                   # Các script khởi tạo và nâng cấp database schema
│   ├── 001_initial_schema.sql    # Schema lõi (tổ chức, căn hộ, cư dân, vai trò, quyền)
│   ├── 002_billing_capabilities.sql # Bổ sung ràng buộc chỉ số và hóa đơn
│   └── 003_operations_capabilities.sql # Bổ sung bảo trì và thông báo
├── src/                          # Mã nguồn Backend API (Node.js + TypeScript + Express)
│   ├── auth/                     # Xác thực JWT, middleware RBAC và scope checks
│   ├── db/                       # Kết nối PostgreSQL pool, migration runner, bootstrap
│   ├── frontend/                 # Đặc tả UI/UX Design System cho Admin & Resident
│   ├── modules/                  # Route handlers theo nghiệp vụ (core, people, billing, operations, admin)
│   ├── app.ts                    # Cấu hình Express app, security headers, global error handler
│   └── server.ts                 # Entrypoint khởi chạy HTTP server
├── web/                          # Frontend Web Application (React + TypeScript + Vite)
│   ├── src/                      # Single Page Application: Auth, Admin Portal, Resident Portal
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── .env.example                  # Mẫu biến môi trường hệ thống
├── compose.yaml                  # Cấu hình Docker Compose (API + PostgreSQL)
├── Dockerfile                    # Containerization cho Backend API
├── package.json                  # Cấu hình phụ thuộc và npm scripts backend
└── tsconfig.json                 # Cấu hình TypeScript compiler
```

---

## 3. Đánh giá Hiện trạng Công nghệ & Hạ tầng

### 3.1 Backend
- **Runtime:** Node.js (>= 22) với ESM (`"type": "module"`).
- **Framework:** Express 5.1.
- **Language:** TypeScript 5.8 (Strict mode).
- **Cơ sở dữ liệu:** PostgreSQL (kết nối qua thư viện `pg` Pool).
- **Xác thực:** JWT (Access Token 15 phút, Refresh Token quay vòng lưu trong bảng `refresh_tokens`).
- **Mã hóa:** `bcryptjs` băm mật khẩu chuẩn cost 12.
- **Hiện trạng build:** `npm run build` thành công, biên dịch ra thư mục `dist/`.

### 3.2 Frontend
- **Công nghệ:** React 19 + TypeScript + Vite.
- **Cấu trúc:** SPA quản lý giao diện phân tách rõ rệt:
  - Trang đăng nhập tập trung.
  - Phân hệ Quản trị viên & Ban quản lý (Admin/Management Portal): Dashboard vận hành, Quản lý tòa nhà, Căn hộ, Cư dân, Hóa đơn thu phí, Xử lý phản ánh, Báo cáo.
  - Phân hệ Cư dân (Resident Portal): Xem căn hộ, tra cứu công nợ, đóng phí mô phỏng, gửi phản ánh sửa chữa, đọc thông báo tòa nhà.
- **Tuân thủ thiết kế:** Đã cấu hình Typography (Space Grotesk + Inter), màu sắc (Deep Charcoal `#1A1F2E`, Accent Cyan `#00B8D9`), không sử dụng layout generic.

### 3.3 Cơ sở dữ liệu & Migrations
- Runner tự viết bằng TypeScript (`src/db/migrate.ts`) dùng `pg_advisory_lock` đảm bảo an toàn phân tán khi chạy migration.
- 3 file migration SQL đầy đủ quan hệ khóa ngoại (Foreign Keys), ràng buộc kiểm tra (`CHECK`), chỉ mục (`INDEX`) và tính toàn vẹn thời gian (`valid_from`, `valid_to`).

---

## 4. Đánh giá Yêu cầu Nghiệp vụ (SRS Alignment)

| Phân hệ nghiệp vụ | Yêu cầu SRS | Hiện trạng đáp ứng | Đánh giá & Khuyến nghị |
|---|---|---|---|
| **Quản lý Tổ chức & Tòa nhà** | Đa tổ chức, đa tòa nhà, khối, tầng, căn hộ | Đã có schema và REST API scoped theo `organization_id` & `building_id` | Đạt yêu cầu MVP |
| **Chủ sở hữu & Cư dân** | Phân tách rõ ràng giữa Chủ sở hữu và Người cư trú; quan hệ nhiều-nhiều theo thời hạn | Schema `people`, `apartment_ownerships`, `apartment_residencies` độc lập | Đạt yêu cầu nghiệp vụ nghiêm ngặt |
| **Ghi nhận Điện, Nước** | Ghi chỉ số định kỳ, không giảm lùi, tính tiêu thụ | Bảng `utility_meters` và `utility_readings`, API ghi nhận có transaction kiểm tra non-decreasing | Đạt yêu cầu MVP |
| **Phí & Hóa đơn** | Đa dạng loại phí (cố định, theo m2, lũy tiến), phát hành hóa đơn theo kỳ | Đã có quy trình: Tạo kỳ -> Sinh hóa đơn -> Phát hành -> Tính số dư | Đạt yêu cầu MVP |
| **Thanh toán** | Thanh toán từng phần hoặc toàn phần, chống trùng lặp | Hỗ trợ `Idempotency-Key`, cập nhật số dư lũy kế | Cần bổ sung test case concurrency |
| **Phản ánh & Bảo trì** | Tiếp nhận phản ánh, phân công kỹ thuật viên, luồng chuyển trạng thái | API chuyển trạng thái có kiểm tra hợp lệ, gán thợ cùng tòa nhà | Đạt yêu cầu MVP |
| **Thông báo** | Gửi thông báo đến cư dân toàn tòa nhà hoặc từng căn hộ | Bảng `notifications` và `notification_recipients` liên kết tài khoản | Đạt yêu cầu MVP |
| **Phân quyền** | Phân biệt Ban quản lý (BQL) vs Ban quản trị (BQT) vs Cư dân | RBAC qua bảng `roles`, `permissions`, `user_role_assignments` | Đạt chuẩn thiết kế phân quyền |

---

## 5. Các điểm còn thiếu sót & Cần xử lý ngay

1. **Bộ kiểm thử tự động (Automated Test Suite):** Backend chưa có unit tests hoặc integration tests cho các route, middleware RBAC và logic tính tiền.
2. **PostgreSQL Runtime Integration:** Chưa có kiểm thử trực tiếp trên môi trường database sạch để nghiệm thu các ràng buộc SQL và migration idempotency.
3. **Phụ thuộc Frontend npm packages:** Thư mục `web/` đã có mã nguồn UI đầy đủ nhưng cần hoàn tất việc cài đặt dependencies và kiểm tra build Vite.
4. **Hồ sơ tài liệu chính thức:** Cần đồng bộ đầy đủ các tài liệu phân tích thiết kế từ `context/` sang `docs/` để làm căn cứ bàn giao chính thức.

