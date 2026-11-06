# Ma trận Phân quyền & Phân cấp Phạm vi (RBAC Matrix) - SmartCondo

**Ngày cập nhật:** 03/11/2026  
**Phiên bản:** 1.0  
**Tác giả:** AI Software Architect & Senior Full-stack Developer  
**Dự án:** Smart Apartment & Condominium Digital Management Platform (SmartCondo)

---

## 1. Nguyên tắc Phân quyền Nghiệp vụ Cốt lõi

Hệ thống SmartCondo áp dụng mô hình phân quyền **Role-Based Access Control kết hợp Data Scope (RBAC + Scoping)** nhằm đáp ứng các quy định thực tế tại các chung cư:

### 1.1 Phân biệt rõ Ban Quản Lý (BQL) và Ban Quản Trị (BQT)
- **Ban Quản Trị (BQT - Board of Representatives):** Đại diện quyền lợi hợp pháp của cư dân và chủ sở hữu, giám sát hoạt động của Ban Quản Lý, theo dõi báo cáo thu chi, quỹ bảo trì, nhưng **không trực tiếp can thiệp vào quy trình tác nghiệp hàng ngày** (không nhập chỉ số điện nước, không trực tiếp sửa chữa kỹ thuật).
- **Ban Quản Lý (BQL - Management Board / Property Management Office):** Đơn vị vận hành chuyên nghiệp phụ trách điều hành tòa nhà, tiếp nhận phản ánh, ghi nhận chỉ số điện nước, lập hóa đơn, thu phí và phân công kỹ sư bảo trì.

### 1.2 Phân biệt rõ Chủ sở hữu (Owner) và Người cư trú (Resident)
- **Chủ sở hữu (Owner):** Người có quyền tài sản hợp pháp đối với căn hộ, có quyền biểu quyết các vấn đề chung của tòa nhà, tra cứu toàn bộ lịch sử sở hữu, chi phí phát sinh và ủy quyền cho người thuê.
- **Cư dân / Người thuê (Resident / Tenant):** Người thực tế sinh sống trong căn hộ. Cư dân có quyền gửi phản ánh sửa chữa, đọc thông báo tòa nhà. Cư dân chỉ được xem hóa đơn và thanh toán phí khi có thỏa thuận hoặc được chủ hộ cấp quyền (`can_view_bills = true`, `can_pay_bills = true`).

### 1.3 Phân cấp Phạm vi Dữ liệu (Data Scope)
Mỗi tài khoản được gán vai trò gắn liền với phạm vi dữ liệu:
- **Scope Toàn cục (Global):** Dành riêng cho `SUPER_ADMIN`.
- **Scope Tổ chức (Organization Scope):** Áp dụng cho cấp quản lý chuỗi tòa nhà thuộc đơn vị vận hành.
- **Scope Tòa nhà (Building Scope):** Áp dụng cho Trưởng ban quản lý tòa nhà, Kế toán tòa nhà, Kỹ thuật viên (chỉ thấy dữ liệu của tòa nhà được phân công).
- **Scope Căn hộ (Apartment Scope):** Áp dụng cho Chủ sở hữu và Cư dân (chỉ xem và thao tác dữ liệu gắn liền với các căn hộ họ có quan hệ hợp lệ trong thời gian thực tế).

---

## 2. Danh mục Vai trò (System Roles)

| Mã Vai trò | Tên Vai trò | Phạm vi Áp dụng | Mô tả Trách nhiệm |
|---|---|---|---|
| `SUPER_ADMIN` | Quản trị viên Tối cao | Toàn hệ thống | Quản trị toàn bộ tổ chức, tạo tài khoản ban đầu, cấu hình hệ thống |
| `BUILDING_MANAGER` | Trưởng/Nhân viên Ban Quản Lý | Theo Tòa nhà | Quản lý căn hộ, cư dân, lập biểu phí, xuất hóa đơn, điều phối bảo trì |
| `TECHNICIAN` | Kỹ thuật viên Tòa nhà | Theo Tòa nhà | Tiếp nhận và cập nhật tiến độ xử lý các phiếu bảo trì được giao |
| `BOARD_MEMBER` | Thành viên Ban Quản Trị | Theo Tòa nhà | Giám sát vận hành, xem dashboard tổng hợp, báo cáo tài chính |
| `OWNER` | Chủ sở hữu Căn hộ | Theo Căn hộ | Xem thông tin sở hữu, tra cứu hóa đơn, gửi bảo trì, ủy quyền |
| `RESIDENT` | Cư dân Sinh sống | Theo Căn hộ | Gửi bảo trì, đọc thông báo, xem/thanh toán hóa đơn nếu được ủy quyền |

---

## 3. Ma trận Quyền hạn Chi tiết (Permission Matrix)

Ký hiệu:
- `FULL`: Toàn quyền trong phạm vi được phân công (Tạo, Đọc, Cập nhật, Xóa).
- `READ`: Chỉ đọc dữ liệu trong phạm vi.
- `SUBMIT`: Gửi yêu cầu mới trong phạm vi.
- `OWN`: Chỉ thao tác với dữ liệu thuộc quyền sở hữu/cư trú của mình.
- `-`: Không có quyền truy cập.

| Nhóm chức năng | Mã Quyền (Permission Code) | `SUPER_ADMIN` | `BUILDING_MANAGER` | `TECHNICIAN` | `BOARD_MEMBER` | `OWNER` | `RESIDENT` |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Quản trị Tổ chức** | `organization:read` | FULL | READ | - | READ | - | - |
| | `organization:manage` | FULL | - | - | - | - | - |
| **Quản lý Tài khoản** | `user:manage` | FULL | READ/CREATE* | - | - | - | - |
| **Bất động sản** | `building:read` | FULL | FULL | READ | READ | READ (Scope) | READ (Scope) |
| | `building:manage` | FULL | FULL | - | - | - | - |
| | `apartment:read` | FULL | FULL | READ | READ | OWN | OWN |
| | `apartment:manage` | FULL | FULL | - | - | - | - |
| **Chủ hộ & Cư dân** | `people:read` | FULL | FULL | - | READ | OWN | OWN |
| | `people:manage` | FULL | FULL | - | - | - | - |
| **Chỉ số Tiện ích** | `utility:read` | FULL | FULL | READ | READ | OWN | OWN (if granted) |
| | `utility:manage` | FULL | FULL | FULL | - | - | - |
| **Biểu phí & Hóa đơn**| `billing:read` | FULL | FULL | - | READ | OWN | OWN (if granted) |
| | `billing:manage` | FULL | FULL | - | - | - | - |
| **Thanh toán** | `payment:record` | FULL | FULL | - | - | OWN (Simulated) | OWN (Simulated) |
| **Bảo trì & Sửa chữa**| `maintenance:read` | FULL | FULL | FULL (Assigned)| READ | OWN | OWN |
| | `maintenance:submit` | FULL | FULL | - | - | OWN | OWN |
| | `maintenance:manage` | FULL | FULL | FULL (Status) | - | - | - |
| **Thông báo** | `notification:read` | FULL | FULL | FULL | FULL | OWN | OWN |
| | `notification:manage`| FULL | FULL | - | - | - | - |
| **Báo cáo & Dashboard**| `dashboard:read` | FULL | FULL | - | FULL | - | - |

*\*Ghi chú: Quản lý tòa nhà chỉ được tạo hoặc gán quyền cho các tài khoản trong phạm vi tòa nhà của mình.*

---

## 4. Cơ chế Xác thực & Kiểm soát Truy cập Phía Server

1. **Kiểm tra Token Không trạng thái (Stateless Token Validation):** Kiểm tra chữ ký mật của JWT và thời hạn hết hạn ở tầng Gateway/Middleware.
2. **Kiểm tra Phân quyền Động (Dynamic Permission Evaluation):** Middleware `requirePermission(perm)` truy vấn quyền thực tế trực tiếp từ cơ sở dữ liệu để đảm bảo việc thu hồi quyền hoặc khóa tài khoản có hiệu lực ngay lập tức mà không cần đợi token hết hạn.
3. **Thực thi Scope tại Tầng Truy vấn Cơ sở dữ liệu (Server-side SQL Scoping):** Mọi câu lệnh `SELECT`, `UPDATE`, `INSERT` trong các route nghiệp vụ bắt buộc phải gắn mệnh đề `WHERE building_id = ...` hoặc kiểm tra quyền sở hữu căn hộ đối với tài khoản đang đăng nhập. Không tin cậy bất kỳ tham số phạm vi nào do client gửi lên mà không xác thực server-side.

