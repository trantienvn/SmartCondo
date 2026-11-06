# Hướng Dẫn Trải Nghiệm & Demo Tính Năng SmartCondo

Tài liệu này hướng dẫn chi tiết kịch bản trải nghiệm toàn bộ các tính năng từ Nghiệp vụ Ban Quản Lý (Admin / BQL / Kế toán) đến Cổng Cư Dân (Resident Portal).

---

## 1. Khởi Chạy Ứng Dụng & Nạp Dữ Liệu Mẫu

### 1.1. Khởi động Backend & Frontend
Mở 2 cửa sổ terminal (hoặc chạy ngầm):
- **Terminal 1 - Backend API Server:**
  - *Lựa chọn A (Node.js Express Backend với PostgreSQL):*
    ```bash
    npm run dev
    # Server chạy tại http://127.0.0.1:3000
    ```
  - *Lựa chọn B (PHP Mock Backend không cần cài DB, dữ liệu tường minh):*
    ```bash
    npm run mock:php
    # Server PHP built-in chạy tại http://127.0.0.1:3000
    ```
- **Terminal 2 - Frontend Web UI:**
  ```bash
  npm run --prefix web dev
  # Giao diện Web chạy tại http://localhost:5173
  ```

### 1.2. Nạp dữ liệu mẫu (Seeding)
Hệ thống hỗ trợ 2 cách nạp dữ liệu mẫu cực kỳ tiện lợi:
- **Cách 1 (Ngay trên giao diện Web):** Mở `http://localhost:5173`, bấm vào nút **"🔄 Nhấn vào đây để nạp lại dữ liệu mẫu Demo (1-Click)"** ngay dưới form đăng nhập.
- **Cách 2 (Qua dòng lệnh CLI):**
  ```bash
  npm run db:seed
  ```

---

## 2. Danh Sách Tài Khoản Demo

Trang đăng nhập đã tích hợp sẵn các nút **Quick Login Chips** (1-Click là tự điền email & password):

| Vai trò | Email | Mật khẩu | Phạm vi & Trách nhiệm |
|---|---|---|---|
| **Ban Quản Lý / Giám đốc** | `manager@smartcondo.vn` | `Manager@123` | Quản lý toàn diện tòa Sky Tower: Cấu trúc căn hộ, cư dân, biểu phí, duyệt kỳ thu. |
| **Kế toán tòa nhà** | `accountant@smartcondo.vn` | `Accountant@123` | Lập kỳ thu, sinh hóa đơn tự động, phát hành hóa đơn, thu tiền mặt / chuyển khoản. |
| **Kỹ thuật viên** | `tech@smartcondo.vn` | `Tech@123` | Ghi chỉ số điện nước hàng tháng, tiếp nhận & xử lý yêu cầu bảo trì kỹ thuật. |
| **Chủ hộ & Cư dân (A-101)** | `resident@smartcondo.vn` | `Resident@123` | Xem hóa đơn, tra cứu bảng kê điện nước, gửi yêu cầu bảo trì, thanh toán trực tuyến. |
| **Khách thuê (A-102)** | `tenant@smartcondo.vn` | `Resident@123` | Cư dân thuê nhà, tra cứu chỉ số điện nước, gửi báo sự cố. |
| **Quản trị cấp cao** | `admin@smartcondo.vn` | `Admin@123456` | Quản trị tổ chức, phân quyền hệ thống. |

---

## 3. Kịch Bản Demo Nghiệp Vụ Chuẩn (End-to-End Workflow)

### Kịch bản 1: Cấu hình Biểu phí & Đơn giá Dịch vụ
1. Đăng nhập bằng tài khoản `manager@smartcondo.vn` hoặc `accountant@smartcondo.vn`.
2. Vào menu **"Biểu phí"** (`/fee-types`):
   - Xem các biểu phí chuẩn đã nạp:
     - `QL-SQM`: Phí quản lý vận hành (8.000 ₫ / m²).
     - `DIEN-SH`: Đơn giá điện sinh hoạt (3.200 ₫ / kWh).
     - `NUOC-SH`: Đơn giá nước sinh hoạt (14.500 ₫ / m³).
     - `XE-MAY`: Phí gửi xe máy (120.000 ₫ / căn).
   - Bấm **"Thêm biểu phí"** để thêm loại phí mới: chọn phương pháp tính (Theo m², Điện sinh hoạt, Nước sinh hoạt, Cố định mỗi căn) và nhập đơn giá.

---

### Kịch bản 2: Ghi nhận Chỉ số Điện & Nước Hàng Tháng
1. Đăng nhập bằng tài khoản `tech@smartcondo.vn` hoặc `manager@smartcondo.vn`.
2. Vào menu **"Chỉ số điện nước"** (`/utility-readings`):
   - Xem lịch sử chốt công tơ của các căn hộ: hệ thống tự động hiển thị số kWh điện tiêu thụ và số m³ nước tiêu thụ thực tế bằng màu trực quan.
   - Bấm **"Ghi chỉ số mới"**:
     - Chọn căn hộ (ví dụ: `Sky Tower · A-101`).
     - Chọn kỳ chốt (Từ ngày – Đến ngày).
     - Nhập số điện cũ và số điện mới: **Giao diện tự động tính ngay số kWh tiêu thụ dự kiến**.
     - Nhập số nước cũ và số nước mới: **Giao diện tự động tính ngay số m³ tiêu thụ dự kiến**.
     - Nhập ghi chú và bấm **"Lưu chỉ số"**.

---

### Kịch bản 3: Quản lý Chủ Sở Hữu & Cư Dân (Phân quyền hóa đơn)
1. Đăng nhập bằng tài khoản `manager@smartcondo.vn`.
2. Vào menu **"Cư dân & Chủ hộ"** (`/people`):
   - Chọn căn hộ cần quản lý (ví dụ: `A-101`).
   - Chuyển tab giữa **"Chủ sở hữu"** và **"Cư dân"**.
   - Bấm **"Thêm chủ sở hữu"**: nhập tên, số điện thoại, email, tỷ lệ sở hữu (ví dụ 100%) và thời gian bắt đầu hiệu lực.
   - Bấm **"Đăng ký cư dân"**: đăng ký khách thuê hoặc thành viên gia đình, thiết lập tích chọn:
     - **Cho phép xem hóa đơn**: Có/Không.
     - **Cho phép nộp tiền hóa đơn**: Có/Không (Tuân thủ triệt để quy tắc bảo mật dữ liệu tài chính).
   - Khi cư dân chuyển đi: bấm nút **"Kết thúc"** để đóng hiệu lực lưu vết lịch sử mà không xóa mất dữ liệu cũ.

---

### Kịch bản 4: Mở Kỳ Thu Phí, Sinh Hóa Đơn Tự Động & Phát Hành
1. Đăng nhập bằng tài khoản `accountant@smartcondo.vn`.
2. Vào menu **"Hóa đơn"** (`/invoices`), chuyển sang tab **"Kỳ thu phí & Lập hóa đơn tự động"**:
   - Bấm **"Mở kỳ thu phí mới"**:
     - Chọn tòa nhà `Sky Tower`.
     - Nhập kỳ thu phí (ví dụ: `01/11/2026` đến `30/11/2026`).
     - Nhập hạn thanh toán (ví dụ: `15/12/2026`).
   - Bấm **"Sinh hóa đơn tự động"**:
     - Hệ thống quét toàn bộ căn hộ đang hoạt động.
     - Quét diện tích m² từng căn x Đơn giá quản lý.
     - Quét số điện & số nước tiêu thụ từ bảng chỉ số tiện ích x Đơn giá điện & nước.
     - Thêm các khoản phí cố định.
     - Tự sinh các hóa đơn và dòng phí tương ứng ở trạng thái `GENERATED`.
   - Bấm **"Phát hành hóa đơn"**:
     - Chuyển trạng thái kỳ thu sang `ISSUED`.
     - Hóa đơn chính thức xuất hiện trên ứng dụng của cư dân căn hộ.

---

### Kịch bản 5: Tra Cứu Chi Tiết Hóa Đơn & Thu Tiền (BQL / Kế toán)
1. Trong menu **"Hóa đơn"**, tab **"Danh sách hóa đơn"**:
   - Bấm **"Chi tiết"** trên bất kỳ hóa đơn nào:
     - Xem pop-up hiển thị đầy đủ bảng kê từng khoản phí (Phí quản lý tòa nhà, Tiền điện x kWh, Tiền nước x m³, Phí gửi xe).
     - Xem tổng tiền, số tiền đã trả, số tiền còn nợ và lịch sử các lần nộp tiền trước đó.
   - Bấm **"Thu tiền"** khi cư dân đến nộp trực tiếp tại quầy:
     - Chọn hình thức: `Tiền mặt` hoặc `Chuyển khoản ngân hàng`.
     - Nhập số tiền thu (mặc định bằng số dư nợ còn lại).
     - Nhập mã giao dịch chuyển khoản hoặc số phiếu thu.
     - Bấm **"Xác nhận thu tiền"**: Hệ thống ghi nhận thanh toán `RECORDED`, cập nhật số nợ còn lại và tự động chuyển trạng thái hóa đơn sang `PAID` khi thu đủ.

---

### Kịch bản 6: Trải Nghiệm Cổng Cư Dân (Resident Portal)
1. Đăng xuất và đăng nhập bằng tài khoản `resident@smartcondo.vn` (Căn A-101).
2. **Trang chủ cư dân:**
   - Xem tổng quan thông tin căn hộ (Block A, Tầng 1, diện tích 75 m²).
   - Thẻ số dư công nợ: Số tiền còn phải nộp và số hóa đơn chờ thanh toán.
3. **Mục "Hóa đơn của tôi":**
   - Danh sách hóa đơn của căn hộ với số tiền còn phải trả.
   - Bấm **"Xem chi tiết"**: Xem trọn vẹn hóa đơn chi tiết minh bạch (tiêu thụ điện nước tháng qua, đơn giá, thành tiền).
   - Bấm **"Thanh toán mô phỏng"**: Hệ thống sinh Idempotency-Key và thực hiện thanh toán online an toàn tức thì. Trạng thái chuyển sang `PAID` (Đã thanh toán) và số nợ về `0 ₫`.
4. **Mục "Chỉ số điện nước":**
   - Cư dân tra cứu công khai lịch sử số công tơ điện nước từng tháng của căn hộ mình.
5. **Mục "Biểu phí":**
   - Cư dân xem bảng niêm yết đơn giá minh bạch của tòa nhà.
6. **Mục "Yêu cầu bảo trì":**
   - Cư dân gửi phản ánh sự cố (nhập tiêu đề, mô tả, mức độ ưu tiên).
   - BQL / Kỹ thuật viên sẽ thấy yêu cầu ngay trên giao diện điều hành để tiếp nhận và cập nhật tiến độ (`Chờ xử lý` → `Đang xử lý` → `Hoàn thành`).

---

### Kịch bản 7: Thanh Toán Tự Động Qua Cổng SePay Ngoại Vi (VietQR + AES-256-CBC)
Hệ thống kết nối trực tiếp với Endpoint SePay ngoài thực tế tại **`https://trantien.id.vn/webcheck/api.php`** theo quy chuẩn bảo mật cao hai chiều:
1. **Mở cổng thanh toán:**
   - Đăng nhập bằng `resident@smartcondo.vn` (Cổng Cư dân) hoặc `accountant@smartcondo.vn` (Cổng Kế toán).
   - Chọn một hóa đơn chưa thanh toán và bấm nút **"Thanh toán QR SePay"** (hoặc **"QR SePay"**).
2. **Khởi tạo đơn hàng bảo mật qua Endpoint ngoài:**
   - Client tự động đóng gói payload `{ action: "create_payment", ... }`, sinh IV 16 bytes ngẫu nhiên và mã hóa **AES-256-CBC** gửi thẳng tới Gateway ngoài: `https://trantien.id.vn/webcheck/api.php`.
   - Server ngoài giải mã bằng khóa bí mật `SePaySecretKey2026_AES256Secure!`, sinh mã định danh duy nhất bắt đầu bằng **`SEVQR`** + 6 chữ số ngẫu nhiên (ví dụ: `SEVQR481973`), tạo link ảnh VietQR chuẩn ngân hàng ICB (VietinBank - `101880291746` - `TRAN VAN TIEN`) và phản hồi gói tin mã hóa AES về Client.
3. **Trải nghiệm giao diện VietQR & Polling (2s/lần):**
   - Khách hàng thấy ảnh VietQR sắc nét, số tiền cần chuyển, thông tin STK/Ngân hàng ICB và mã nội dung `SEVQR...` nổi bật có nút **Sao chép**.
   - Client tự động thiết lập tiến trình **Polling mỗi 2 giây** gửi `check_status` (được mã hóa AES) tới `https://trantien.id.vn/webcheck/api.php` để lắng nghe biến động tài khoản.
   - Bộ đếm ngược 15 phút bảo vệ phiên giao dịch (`EXPIRED`).
4. **Khớp lệnh Webhook tự động (Demo trực tiếp):**
   - Ngay trong pop-up, bấm nút **"⚡ Mô phỏng khách chuyển tiền"**.
   - Client gửi Webhook giả lập tới SePay Webhook Endpoint ngoài `https://trantien.id.vn/webcheck/sepaywebhook.php`. Server ngoài xác thực token, kiểm tra mã `SEVQR...` và cập nhật đơn hàng thành `PAID`.
5. **Xác nhận hoàn tất & Tự động gạch nợ hệ thống (Client OK):**
   - Chu kỳ polling tiếp theo nhận phản hồi `status: "PAID"` từ `https://trantien.id.vn/webcheck/api.php`.
   - Client tự ngắt Polling, đồng thời tự động gọi API `/payments` gạch nợ hóa đơn trong SmartCondo và hiển thị màn hình chúc mừng thanh toán thành công kèm mã giao dịch, số tiền và thời gian ghi nhận.
   - Hóa đơn của căn hộ chuyển trạng thái sang `PAID` và số dư nợ về `0 ₫`.

---

## 4. Kiểm Thử Xây Dựng & Tự Động Hóa (Verification)

### 4.1. Kiểm thử biên dịch toàn diện
```bash
npm run build:all
```
Kết quả mong muốn: Biên dịch cả Backend TypeScript và Frontend Vite thành công 100%, không phát sinh lỗi.

### 4.2. Kiểm thử PHP Mock Backend
```bash
# Kiểm tra toàn bộ 10 endpoint CRUD & chu trình quản lý
npm run test:mock

# Kiểm tra toàn diện 6 bước thanh toán SePay AES-256-CBC & Webhook
npm run test:sepay
```
Kết quả mong muốn: Toàn bộ assertions đều PASS, xác thực tính đúng đắn của logic tính toán, bảo mật mã hóa và gạch nợ tự động.
