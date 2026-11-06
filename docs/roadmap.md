# Lộ trình Triển khai Dự án (Project Roadmap) - SmartCondo

**Ngày cập nhật:** 03/11/2026  
**Phiên bản:** 1.0  
**Tác giả:** AI Software Architect & Senior Full-stack Developer  
**Dự án:** Smart Apartment & Condominium Digital Management Platform (SmartCondo)

---

## 1. Tổng quan Chiến lược Phát triển

Dự án SmartCondo được chia làm 5 giai đoạn phát triển rõ ràng nhằm kiểm soát rủi ro, tối ưu hóa nguồn lực và đảm bảo bàn giao sản phẩm khả dụng tối thiểu (MVP) hoạt động ổn định trước khi mở rộng các phân hệ phức tạp.

```mermaid
timeline
    title Lộ trình Phát triển Nền tảng SmartCondo
    section Giai đoạn 1 : Nền tảng Cốt lõi & Phân quyền (MVP)
        Khảo sát & Thiết kế Kiến trúc : Hoàn thành
        Mô hình Dữ liệu & Migrations : Hoàn thành
        Xác thực JWT & RBAC : Hoàn thành
        Quản lý Tổ chức & Tòa nhà : Hoàn thành
    section Giai đoạn 2 : Quản lý Cư dân & Tài chính (MVP)
        Chủ sở hữu & Cư trú có thời hạn : Hoàn thành
        Ghi nhận Chỉ số Điện/Nước : Hoàn thành
        Tự động tính phí & Xuất hóa đơn : Hoàn thành
        Thanh toán mô phỏng : Hoàn thành
    section Giai đoạn 3 : Vận hành & Trải nghiệm (MVP)
        Quy trình Phiếu Phản ánh & Bảo trì : Hoàn thành
        Trung tâm Bảng tin & Thông báo : Hoàn thành
        Web Admin & Resident Portal : Đang hoàn thiện
        Bộ Kiểm thử Tự động : Đang thực hiện
    section Giai đoạn 4 : Tích hợp IoT & Cổng Thanh toán
        Thu thập Dữ liệu Công tơ Thông minh : Dự kiến
        Tích hợp Cổng VNPay / MoMo / ZaloPay : Dự kiến
        Ứng dụng Di động Cư dân (Mobile App) : Dự kiến
    section Giai đoạn 5 : Phân tích Nâng cao & Tự động hóa
        Trí tuệ Nhân tạo & Dự báo Điện/Nước : Dự kiến
        Báo cáo Tự động cho Ban Quản Trị : Dự kiến
        Mở rộng Đa cụm Tòa nhà : Dự kiến
```

---

## 2. Kế hoạch Chi tiết theo Từng Giai đoạn

### Giai đoạn 1: Nền tảng Cốt lõi (Foundation & Core Infrastructure) - [MVP]
- **Mục tiêu:** Thiết lập cấu trúc hệ thống chuẩn, mô hình phân cấp tổ chức và cơ chế bảo mật xác thực nhiều tầng.
- **Các hạng mục chính:**
  - Khảo sát mã nguồn, đặc tả Use Case, thiết kế ERD và ma trận phân quyền RBAC.
  - Thiết lập Backend Node.js/TypeScript/Express với tiêu chuẩn an toàn (CORS, Security Headers, Input Validation).
  - Triển khai PostgreSQL schema và migration runner có khóa chống tranh chấp (`pg_advisory_lock`).
  - Quản lý phân cấp: Tổ chức (`organizations`), Tòa nhà (`buildings`), Khối (`blocks`), Tầng (`floors`), Căn hộ (`apartments`).
  - Phân quyền theo tòa nhà (Building Scoping) đảm bảo an toàn dữ liệu đa khách thuê.

### Giai đoạn 2: Quản lý Cư dân & Tài chính Dịch vụ (People & Billing) - [MVP]
- **Mục tiêu:** Giải quyết bài toán then chốt trong quản lý chung cư: quan hệ sở hữu/cư trú và thu phí dịch vụ.
- **Các hạng mục chính:**
  - Tách bạch thông tin nhân thân (`people`), quyền sở hữu căn hộ (`apartment_ownerships`) và thực tế sinh sống (`apartment_residencies`).
  - Cấu hình biểu phí linh hoạt: phí quản lý theo diện tích, phí gửi xe cố định, phí điện nước theo bậc thang hoặc chỉ số.
  - Ghi nhận chỉ số công tơ điện nước có kiểm tra tính đơn điệu tăng dần.
  - Quy trình kế toán khép kín: Khởi tạo kỳ thu -> Tính toán phát sinh -> Sinh hóa đơn -> Phát hành -> Nhận thanh toán và cập nhật công nợ lũy kế.

### Giai đoạn 3: Vận hành Tòa nhà & Cổng Tương tác (Operations & Portals) - [MVP]
- **Mục tiêu:** Đưa hệ thống vào vận hành thực tế thông qua các kênh tương tác số giữa Ban quản lý và Cư dân.
- **Các hạng mục chính:**
  - Tiếp nhận và điều phối phiếu sửa chữa, phân công kỹ thuật viên cùng tòa nhà, lịch sử tiến độ.
  - Phát bảng tin thông báo đến toàn thể cư dân hoặc theo từng khối/tầng/căn hộ.
  - Dashboard tổng quan tình trạng vận hành, tỷ lệ thu phí, phòng trống và phản ánh tồn đọng.
  - Giao diện Admin Portal & Resident Portal chuẩn UX/UI chuyên nghiệp.
  - Xây dựng bộ Unit & Integration Test tự động.

### Giai đoạn 4: Tích hợp IoT & Cổng Thanh toán Thực (IoT & Real Payments)
- **Mục tiêu:** Tự động hóa khâu thu thập dữ liệu và thanh toán không tiền mặt.
- **Các hạng mục chính:**
  - Tích hợp MQTT / Modbus gateway đọc chỉ số công tơ điện nước tự động theo giờ/ngày.
  - Kết nối cổng thanh toán ngân hàng (VNPay, VietQR, MoMo, ZaloPay) hỗ trợ webhook đối soát tự động.
  - Phát triển ứng dụng di động Resident Mobile App (Flutter / React Native) với Push Notifications qua Firebase.

### Giai đoạn 5: Phân tích Dữ liệu Nâng cao & Mở rộng (Analytics & Scale)
- **Mục tiêu:** Tối ưu hóa vận hành quy mô lớn và cung cấp báo cáo phân tích thông minh.
- **Các hạng mục chính:**
  - Phát hiện rò rỉ nước và bất thường tiêu thụ điện bằng thuật toán phân tích chuỗi thời gian (Anomaly Detection).
  - Báo cáo phân tích chuyên sâu doanh thu, chi phí, chỉ số hài lòng cư dân cho Ban Quản Trị.
  - Hỗ trợ triển khai Kubernetes cluster trên hạ tầng Cloud (AWS / Google Cloud).

---

## 3. Tiêu chí Đánh giá Thành công Giai đoạn MVP (MVP Acceptance Criteria)

1. **Tính Đúng đắn Nghiệp vụ (Business Correctness):**
   - Không được xảy ra tình trạng cư dân tòa nhà này xem được dữ liệu của tòa nhà khác.
   - Hóa đơn sinh ra phải khớp 100% với đơn giá và chỉ số tiêu thụ.
   - Trạng thái công nợ của căn hộ phải được cập nhật tức thời khi có thanh toán.
2. **Độ Tin cậy Kỹ thuật (Technical Reliability):**
   - 100% các endpoint được kiểm soát quyền qua JWT và Scoping.
   - Các thao tác tài chính bắt buộc chạy trong Database Transaction có xử lý lỗi Rollback toàn diện.
   - Mã nguồn vượt qua kiểm tra TypeScript (`tsc`) và Test Suite không phát sinh lỗi.
3. **Trải nghiệm Người dùng (User Experience):**
   - Giao diện phản hồi nhanh (< 200ms cho các thao tác thông thường).
   - Thiết kế thân thiện, dễ sử dụng cho cả nhân viên kỹ thuật và cư dân lớn tuổi.

