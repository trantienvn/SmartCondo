# SmartCondo - Mockup Backend (PHP)

Máy chủ Backend mô phỏng độc lập bằng **PHP thuần** (không cần cài thêm extension, không cần Composer, không cần Docker hay PostgreSQL).

---

## 1. Mục Đích & Điểm Nổi Bật

- **Kiểm thử Demo Frontend siêu tốc:** Khởi chạy server API trong chưa đầy 1 giây.
- **Trùng khớp 100% Endpoint với bản Express Production:** Các đường dẫn API `/api/v1/...`, cấu trúc request, response `{ success: true, data: ... }` và mã lỗi `{ success: false, error: ... }` hoàn toàn đồng nhất.
- **Dữ liệu tường minh, dễ đọc (`mock/data.php`):** Toàn bộ dữ liệu tổ chức, tòa nhà Sky Tower, căn hộ, chủ sở hữu, cư dân, biểu phí, số điện nước, kỳ thu, hóa đơn chi tiết được định nghĩa dưới dạng mảng PHP có chú thích tiếng Việt rõ ràng.
- **Lưu trữ trạng thái động (`mock/store.json`):** Khi thao tác trên giao diện Web (ghi chỉ số điện nước, tạo biểu phí, mở kỳ thu, sinh hóa đơn tự động, phát hành, nộp tiền mặt/chuyển khoản/mô phỏng), dữ liệu sẽ được ghi nhận và cập nhật ngay lập tức.
- **Nạp lại dữ liệu gốc tức thì (1-Click Reset):** Gọi `POST /api/v1/demo/seed` hoặc bấm nút Reset trên giao diện Web để hoàn nguyên dữ liệu về trạng thái ban đầu từ `mock/data.php`.

---

## 2. Cách Khởi Chạy

### Cách 1: Qua lệnh npm (tiện lợi nhất)
```bash
npm run mock:php
```

### Cách 2: Trực tiếp bằng PHP CLI
```bash
php -S 127.0.0.1:3000 mock/server.php
```

Sau khi khởi chạy PHP Mockup Backend, mở terminal khác để khởi chạy giao diện Web:
```bash
npm run --prefix web dev
```
Truy cập [http://localhost:5173](http://localhost:5173) để trải nghiệm đầy đủ tính năng!

---

## 3. Danh Sách Tài Khoản Thử Nghiệm

Mật khẩu dùng chung cho các tài khoản demo (hoặc click vào Quick Login Chips trên giao diện Web):

| Vai trò | Email đăng nhập | Mật khẩu | Phạm vi quyền hạn |
|---|---|---|---|
| **Ban Quản Lý** | `manager@smartcondo.vn` | `Manager@123` | Quản lý toàn bộ tòa nhà Sky Tower: căn hộ, cư dân, biểu phí, kỳ thu |
| **Kế toán** | `accountant@smartcondo.vn` | `Accountant@123` | Lập kỳ thu, sinh hóa đơn tự động, thu tiền mặt/chuyển khoản |
| **Kỹ thuật viên** | `tech@smartcondo.vn` | `Tech@123` | Ghi chỉ số điện nước, xử lý yêu cầu bảo trì |
| **Cư dân (A-101)** | `resident@smartcondo.vn` | `Resident@123` | Xem hóa đơn, bảng kê điện nước, gửi yêu cầu bảo trì, thanh toán |
| **Khách thuê (A-102)** | `tenant@smartcondo.vn` | `Resident@123` | Cư dân thuê nhà, xem điện nước, gửi báo sự cố |
| **Quản trị viên** | `admin@smartcondo.vn` | `Admin@123456` | Quản trị viên cấp cao toàn hệ thống |

---

## 4. Chạy Bộ Kiểm Thử Tự Động cho Mock Backend
Để kiểm tra tính toàn vẹn của tất cả các route trong Mockup Server:
```bash
php mock/test.php
```
Kết quả kiểm thử tự động 10 kịch bản end-to-end:
1. Healthcheck readiness
2. Xác thực JWT & phân quyền vai trò
3. Thống kê Dashboard
4. Ghi nhận chỉ số điện nước mới
5. Sinh hóa đơn tự động theo diện tích & số điện nước tiêu thụ
6. Phát hành hóa đơn kỳ thu
7. Truy vấn bảng kê chi tiết từng dòng phí hóa đơn
8. Ghi nhận thanh toán và khấu trừ công nợ
9. Xác nhận chuyển trạng thái sang `PAID` và dư nợ về 0
10. Reset dữ liệu về trạng thái ban đầu thành công
