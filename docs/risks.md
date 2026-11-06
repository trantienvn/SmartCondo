# Danh mục Rủi ro Kỹ thuật & Nghiệp vụ (Risk Management) - SmartCondo

**Ngày cập nhật:** 03/11/2026  
**Phiên bản:** 1.0  
**Tác giả:** AI Software Architect & Senior Full-stack Developer  
**Dự án:** Smart Apartment & Condominium Digital Management Platform (SmartCondo)

---

## 1. Tổng quan Quản lý Rủi ro

Việc triển khai hệ thống chuyển đổi số quản trị chung cư (SmartCondo) tiềm ẩn nhiều rủi ro đặc thù liên quan đến tính nhạy cảm của dữ liệu tài chính, phân quyền phức tạp giữa các bên liên quan và môi trường mạng đa thiết bị. Tài liệu này xác định các rủi ro chính, đánh giá mức độ ảnh hưởng, xác suất xảy ra và đề xuất phương án phòng ngừa, ứng phó cụ thể.

---

## 2. Rủi ro Nghiệp vụ (Business Risks)

| Mã Rủi ro | Mô tả Rủi ro | Xác suất | Tác động | Mức độ | Biện pháp Phòng ngừa & Xử lý |
|---|---|:---:|:---:|:---:|---|
| **BR-01** | **Xung đột quyền hạn giữa Ban Quản Lý (BQL) và Ban Quản Trị (BQT)**<br>BQT đòi can thiệp vào tác nghiệp hàng ngày hoặc BQL không minh bạch số liệu quỹ. | Trung bình | Cao | **CAO** | Thiết kế phân quyền rành mạch: BQT chỉ có quyền giám sát, đọc báo cáo dòng tiền và tổng hợp phiếu bảo trì; BQL nắm quyền tác nghiệp điều hành. Mọi thay đổi tài chính đều lưu vết `audit_logs`. |
| **BR-02** | **Tranh chấp thông tin giữa Chủ sở hữu và Người thuê căn hộ**<br>Người thuê nhận hóa đơn sai lệch hoặc thanh toán không được ghi nhận cho chủ hộ. | Cao | Cao | **CAO** | Schema quan hệ thời hạn (`valid_from`, `valid_to`), phân tách rõ `ownership_percent` và `relationship`. Cung cấp cờ ủy quyền rõ ràng `can_view_bills` và `can_pay_bills`. |
| **BR-03** | **Sai lệch số liệu khi ghi chỉ số điện, nước thủ công**<br>Nhân viên nhập nhầm số làm tăng vọt tiền điện nước, gây khiếu nại gay gắt từ cư dân. | Cao | Trung bình | **TRUNG BÌNH**| Ràng buộc nghiệp vụ kiểm tra tính đơn điệu không giảm lùi (`reading >= previous_reading`). Cảnh báo khi mức tiêu thụ vượt ngưỡng bất thường (>200% trung bình 3 tháng gần nhất). |
| **BR-04** | **Thanh toán trùng lặp (Double Charging)**<br>Cư dân bấm thanh toán nhiều lần do mạng chậm hoặc ứng dụng treo. | Trung bình | Cao | **CAO** | Triển khai cơ chế khóa `Idempotency-Key` trên API thanh toán. Đóng gói thao tác cập nhật số dư và gạch nợ trong Database Transaction có khóa hàng (`SELECT ... FOR UPDATE`). |
| **BR-05** | **Khiếu nại về tiến độ và chất lượng bảo trì**<br>Yêu cầu sửa chữa bị bỏ quên hoặc bàn giao kéo dài không rõ lý do. | Cao | Trung bình | **TRUNG BÌNH**| Quy chuẩn hóa State Machine phiếu bảo trì: `PENDING` -> `APPROVED` -> `ASSIGNED` -> `IN_PROGRESS` -> `COMPLETED`. Mỗi lần chuyển trạng thái đều lưu vết thời gian và nhân sự phụ trách vào `maintenance_updates`. |

---

## 3. Rủi ro Kỹ thuật (Technical Risks)

| Mã Rủi ro | Mô tả Rủi ro | Xác suất | Tác động | Mức độ | Biện pháp Phòng ngừa & Xử lý |
|---|---|:---:|:---:|:---:|---|
| **TR-01** | **Rò rỉ dữ liệu giữa các Tòa nhà (Cross-tenant Data Leakage)**<br>Lỗi truy vấn khiến quản lý tòa nhà A thấy cư dân hoặc doanh thu của tòa nhà B. | Thấp | Nghiêm trọng | **CAO** | Thực thi cơ chế Building Scoping cưỡng bức ở tầng Database query. Bắt buộc kiểm tra `building_id` ở cấp Middleware và trong mệnh đề `WHERE` của SQL. Không tin cậy dữ liệu do client gửi lên. |
| **TR-02** | **Tranh chấp Migration khi Scale nhiều Agent/Instance**<br>Nhiều instance chạy đồng thời cố gắng áp dụng migration gây xung đột schema. | Trung bình | Cao | **TRUNG BÌNH**| Tích hợp `pg_advisory_lock` trong migration runner. Đảm bảo migration chạy tuần tự, có kiểm tra bảng `schema_migrations` trước khi thực thi. |
| **TR-03** | **Chiếm đoạt phiên đăng nhập (Token Hijacking)**<br>Access token bị lộ qua tấn công XSS hoặc rò rỉ mạng. | Thấp | Nghiêm trọng | **CAO** | Đặt thời hạn sống của Access Token ngắn (15 phút). Refresh Token quay vòng (Rotation) và lưu hash trong Database. Khi phát hiện Refresh Token cũ bị tái sử dụng, lập tức thu hồi toàn bộ token của tài khoản. |
| **TR-04** | **Nghẽn hiệu năng khi chốt sổ cuối kỳ (Billing Peak Load)**<br>Hàng nghìn căn hộ cùng được tính phí và xuất hóa đơn trong vài phút làm treo DB. | Trung bình | Trung bình | **TRUNG BÌNH**| Xử lý tạo hóa đơn theo lô (Batch Processing) trong transaction độc lập cho từng khối nhà; lập chỉ mục tối ưu trên các cột khóa ngoại và ngày tháng. |
| **TR-05** | **Mất dữ liệu do lỗi phần cứng hoặc sự cố máy chủ**<br>Database gặp sự cố hỏng đĩa hoặc mất mát dữ liệu không thể phục hồi. | Thấp | Nghiêm trọng | **CAO** | Cấu hình Docker volume gắn kết với ổ cứng bền vững; thiết lập chiến lược sao lưu tự động định kỳ (`pg_dump`) và lưu trữ bản sao ngoài máy chủ. |
| **TR-06** | **Thiếu môi trường kiểm thử trực tiếp Database trong CI/CD**<br>Mã nguồn biên dịch TypeScript thành công nhưng phát sinh lỗi cú pháp SQL khi chạy thật. | Cao | Cao | **CAO** | Xây dựng bộ Unit Test độc lập mock tầng DB cho logic nghiệp vụ, đồng thời bổ sung Integration Test chạy trên container PostgreSQL sạch trong quy trình CI/CD. |

---

## 4. Kế hoạch Giám sát & Đánh giá Định kỳ

1. **Rà soát Bảo mật Hàng tuần:** Kiểm tra các bản vá bảo mật của Node.js, Express và thư viện phụ thuộc (`npm audit`).
2. **Kiểm tra Toàn vẹn Dữ liệu Định kỳ:** Chạy các truy vấn kiểm toán (Audit queries) phát hiện hóa đơn có số dư âm hoặc chỉ số điện nước giảm lùi.
3. **Theo dõi Hiệu năng Ứng dụng:** Giám sát thời gian phản hồi API, tỷ lệ lỗi 5xx và tình trạng kết nối connection pool của PostgreSQL.

