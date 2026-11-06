# ĐẶC TẢ DỰ ÁN
# NỀN TẢNG CHUYỂN ĐỔI SỐ TRONG QUẢN LÝ VÀ VẬN HÀNH CHUNG CƯ THÔNG MINH
**Smart Apartment & Condominium Digital Management Platform**

- Phiên bản: 1.0
- Loại tài liệu: Software Requirements Specification (SRS) + Agent Development Specification
- Trạng thái: Draft – Cơ sở triển khai
- Đối tượng sử dụng: AI Coding Agent, Developer, Tester, Project Manager

---

# 1. TỔNG QUAN DỰ ÁN

## 1.1. Giới thiệu

Smart Apartment & Condominium Digital Management Platform là nền tảng số hóa và hỗ trợ chuyển đổi số trong công tác quản lý, vận hành chung cư.

Hệ thống cung cấp một nền tảng tập trung để quản lý thông tin tòa nhà, căn hộ, chủ sở hữu, cư dân, phương tiện, phí dịch vụ, hóa đơn, thanh toán, bảo trì và tương tác giữa Ban quản lý với cư dân.

Hệ thống bao gồm:

- **Admin/Management Web Portal:** Dành cho quản trị hệ thống, Ban quản lý và nhân viên vận hành.
- **Resident Web Portal:** Dành cho cư dân và chủ sở hữu căn hộ.
- **Backend REST API:** Xử lý nghiệp vụ, phân quyền, dữ liệu và tích hợp.
- **Database:** Lưu trữ dữ liệu tập trung.
- **IoT Integration Module:** Tiếp nhận dữ liệu điện, nước và thiết bị thông minh.
- **Analytics Module:** Thống kê và hỗ trợ ra quyết định.

Mục tiêu không chỉ là thay thế sổ sách giấy bằng phần mềm mà còn chuẩn hóa quy trình, tự động hóa hoạt động vận hành, minh bạch dữ liệu và cải thiện chất lượng dịch vụ cư dân.

## 1.2. Bài toán cần giải quyết

Các vấn đề phổ biến trong quản lý chung cư:

1. Thông tin căn hộ, chủ sở hữu và cư dân được quản lý phân tán.
2. Việc ghi nhận điện, nước và tính phí còn phụ thuộc vào thao tác thủ công.
3. Cư dân khó tra cứu hóa đơn và lịch sử thanh toán tập trung.
4. Quy trình tiếp nhận và xử lý phản ánh, sửa chữa thiếu khả năng theo dõi.
5. Thông báo đến cư dân chưa có hệ thống tập trung.
6. Khó kiểm soát phương tiện, thẻ ra vào và đăng ký tiện ích.
7. Ban quản lý thiếu số liệu tổng hợp để đánh giá tình trạng vận hành.
8. Việc lưu trữ và tra cứu hồ sơ mất thời gian.

## 1.3. Mục tiêu tổng quát

Xây dựng hệ thống quản lý chung cư tập trung, có khả năng:

- Số hóa dữ liệu và hồ sơ quản lý.
- Chuẩn hóa quy trình vận hành.
- Tự động hóa việc lập hóa đơn và nhắc thanh toán.
- Minh bạch thông tin phí dịch vụ.
- Cải thiện khả năng tương tác giữa Ban quản lý và cư dân.
- Theo dõi tiến độ xử lý yêu cầu bảo trì.
- Hỗ trợ giám sát hoạt động thông qua dashboard và báo cáo.
- Có khả năng tích hợp IoT và các dịch vụ bên ngoài.

## 1.4. Đối tượng sử dụng

| Đối tượng | Vai trò |
|---|---|
| System Administrator | Quản trị toàn hệ thống |
| Building Manager | Quản lý hoạt động của tòa nhà |
| Management Staff | Nhân viên vận hành |
| Accountant | Nhân viên kế toán, quản lý thu phí |
| Technical Staff | Nhân viên kỹ thuật, bảo trì |
| Security Staff | Nhân viên an ninh, phương tiện |
| Management Board | Ban quản trị chung cư |
| Apartment Owner | Chủ sở hữu căn hộ |
| Resident | Người đang sinh sống tại căn hộ |

**Lưu ý nghiệp vụ:** Ban quản lý và Ban quản trị là hai chủ thể khác nhau. Hệ thống phải phân biệt quyền hạn của hai bên. Ban quản lý thực hiện công tác vận hành; Ban quản trị thực hiện các chức năng đại diện, giám sát và phê duyệt theo phạm vi được cấu hình.

Chủ sở hữu và người cư trú cũng là hai đối tượng khác nhau. Một căn hộ có thể có chủ sở hữu không trực tiếp sinh sống và có người thuê đang cư trú.

---

# 2. PHẠM VI HỆ THỐNG

## 2.1. Phạm vi triển khai

Hệ thống được thiết kế theo mô hình hỗ trợ nhiều tòa nhà.

Cấu trúc quản lý:

Organization → Building → Block → Floor → Apartment → Resident.

Trong đó:
- Organization: Đơn vị quản lý hoặc tổ chức vận hành.
- Building: Tòa nhà chung cư.
- Block: Khối nhà hoặc tháp.
- Floor: Tầng.
- Apartment: Căn hộ.
- Resident: Người đang cư trú.
- Owner: Chủ sở hữu căn hộ.

Hệ thống cần hỗ trợ quản lý nhiều tòa nhà trong cùng một tổ chức nhưng dữ liệu phải được phân tách theo phạm vi quyền hạn.

## 2.2. Các phân hệ chức năng

| Mã | Phân hệ | Mức độ ưu tiên |
|---|---|---|
| MOD-01 | Xác thực và phân quyền | Bắt buộc |
| MOD-02 | Quản lý tổ chức và tòa nhà | Bắt buộc |
| MOD-03 | Quản lý căn hộ | Bắt buộc |
| MOD-04 | Quản lý chủ sở hữu và cư dân | Bắt buộc |
| MOD-05 | Quản lý phí và chỉ số điện nước | Bắt buộc |
| MOD-06 | Hóa đơn và công nợ | Bắt buộc |
| MOD-07 | Thanh toán | Bắt buộc |
| MOD-08 | Quản lý yêu cầu và bảo trì | Bắt buộc |
| MOD-09 | Thông báo | Bắt buộc |
| MOD-10 | Quản lý phương tiện | Mở rộng |
| MOD-11 | Quản lý tiện ích chung | Mở rộng |
| MOD-12 | Phản ánh và khảo sát cư dân | Mở rộng |
| MOD-13 | Dashboard và báo cáo | Bắt buộc |
| MOD-14 | IoT điện nước | Nâng cao |
| MOD-15 | AI và phân tích dữ liệu | Nâng cao |
| MOD-16 | Nhật ký hoạt động | Bắt buộc |

## 2.3. Ngoài phạm vi phiên bản đầu tiên

Không triển khai đầy đủ trong MVP:

- Hệ thống kế toán doanh nghiệp.
- Quản lý pháp lý và giao dịch mua bán bất động sản.
- Điều khiển thang máy và hệ thống PCCC thực tế.
- Tích hợp thiết bị kiểm soát ra vào thương mại.
- Ký hợp đồng điện tử có giá trị pháp lý thực tế.
- Kết nối ngân hàng và thanh toán tiền thật nếu chưa có tài khoản tích hợp.
- Digital Twin 3D hoàn chỉnh.

Có thể mô phỏng các chức năng trên để phục vụ trình diễn nhưng phải ghi rõ là dữ liệu hoặc quy trình mô phỏng.

---

# 3. YÊU CẦU CHỨC NĂNG CHI TIẾT

## 3.1. MOD-01: Xác thực và phân quyền

### Chức năng

- Đăng nhập bằng email và mật khẩu.
- Đăng xuất.
- Làm mới phiên đăng nhập.
- Đổi mật khẩu.
- Quên mật khẩu và khôi phục mật khẩu.
- Quản lý tài khoản người dùng.
- Khóa hoặc mở khóa tài khoản.
- Gán vai trò và quyền hạn.
- Kiểm tra quyền truy cập theo API và giao diện.

### Vai trò hệ thống

| Role | Quyền chính |
|---|---|
| SUPER_ADMIN | Quản lý toàn bộ tổ chức và hệ thống |
| ORG_ADMIN | Quản lý tổ chức |
| BUILDING_MANAGER | Quản lý tòa nhà được giao |
| ACCOUNTANT | Quản lý phí, hóa đơn, thanh toán |
| TECHNICIAN | Xử lý bảo trì |
| SECURITY | Quản lý phương tiện và an ninh |
| BOARD_MEMBER | Theo dõi, giám sát và thực hiện chức năng được cấp |
| OWNER | Theo dõi căn hộ thuộc sở hữu |
| RESIDENT | Sử dụng dịch vụ cư dân |

Phân quyền cần kết hợp:
- Role-Based Access Control (RBAC).
- Building-level access control.
- Apartment-level access control.
- Quyền sở hữu và quan hệ cư trú.
- Quyền thao tác cụ thể như view, create, update, delete, approve.

### Quy tắc

1. Người dùng chỉ được truy cập dữ liệu trong phạm vi được cấp.
2. Cư dân chỉ xem thông tin căn hộ mà họ có quyền truy cập.
3. Nhân viên kỹ thuật không được tự ý chỉnh sửa hóa đơn.
4. Kế toán không được tự ý thay đổi quyền quản trị.
5. Mọi thao tác nhạy cảm phải được ghi nhận trong nhật ký.
6. Không được dựa vào việc ẩn nút trên giao diện để thay thế kiểm tra quyền ở Backend.

## 3.2. MOD-02: Quản lý tổ chức và tòa nhà

### Quản lý tổ chức

Thông tin:
- Tên tổ chức.
- Mã tổ chức.
- Địa chỉ.
- Email.
- Số điện thoại.
- Người đại diện.
- Trạng thái hoạt động.

### Quản lý tòa nhà

Thông tin:
- Tên tòa nhà.
- Mã tòa nhà.
- Địa chỉ.
- Số tầng.
- Số khối.
- Tổng số căn hộ.
- Năm đưa vào sử dụng.
- Đơn vị quản lý.
- Trạng thái hoạt động.

### Chức năng

- Thêm, sửa, xem, ngừng hoạt động tòa nhà.
- Quản lý các khối nhà.
- Quản lý tầng.
- Quản lý thông tin tổng quan.
- Gán nhân viên phụ trách.
- Xem thống kê căn hộ theo tòa nhà.

### Quy tắc

- Mã tòa nhà phải duy nhất trong phạm vi tổ chức.
- Không xóa tòa nhà đã có dữ liệu nghiệp vụ liên quan.
- Chỉ cho phép ngừng hoạt động khi có quyền phù hợp.
- Mọi dữ liệu con phải thuộc đúng tòa nhà và tổ chức.

## 3.3. MOD-03: Quản lý căn hộ

### Thông tin căn hộ

- Mã căn hộ.
- Tòa nhà.
- Khối nhà.
- Tầng.
- Diện tích.
- Số phòng ngủ.
- Số phòng vệ sinh.
- Loại căn hộ.
- Trạng thái sử dụng.
- Ghi chú.
- Hình ảnh hoặc tài liệu liên quan.

### Trạng thái căn hộ

- AVAILABLE: Chưa có người cư trú.
- OCCUPIED: Đang có người cư trú.
- RENTED: Đang được cho thuê.
- MAINTENANCE: Đang bảo trì.
- INACTIVE: Ngừng khai thác.

Trạng thái thực tế cần được xác định từ dữ liệu quan hệ chủ sở hữu, cư dân, hợp đồng và tình trạng vận hành; không chỉ cho phép người dùng tùy ý thay đổi trạng thái.

### Chức năng

- Thêm, sửa, xem thông tin căn hộ.
- Tìm kiếm theo mã căn hộ.
- Lọc theo tòa nhà, tầng, trạng thái.
- Xem danh sách chủ sở hữu.
- Xem danh sách cư dân hiện tại.
- Xem lịch sử cư trú.
- Xem lịch sử hóa đơn.
- Xem các yêu cầu bảo trì liên quan.

## 3.4. MOD-04: Quản lý chủ sở hữu và cư dân

### Thông tin cá nhân

- Họ và tên.
- Email.
- Số điện thoại.
- Ngày sinh (nếu cần).
- Địa chỉ liên hệ.
- Ảnh đại diện.
- Giấy tờ xác minh (nếu có).
- Trạng thái tài khoản.

### Quan hệ với căn hộ

Một căn hộ có thể có:
- Một hoặc nhiều chủ sở hữu.
- Một hoặc nhiều người cư trú.
- Người thuê.
- Người thân sinh sống cùng.
- Người đại diện liên hệ.

### Chức năng

- Thêm chủ sở hữu.
- Thêm cư dân.
- Gán người vào căn hộ.
- Chuyển đổi trạng thái cư trú.
- Ghi nhận ngày bắt đầu và kết thúc cư trú.
- Lưu lịch sử thay đổi.
- Quản lý hồ sơ thuê.
- Xác minh thông tin cư dân.

### Quy tắc

- Một người có thể sở hữu hoặc cư trú tại nhiều căn hộ.
- Không đồng nhất chủ sở hữu với cư dân.
- Quan hệ cư trú cần có ngày hiệu lực.
- Không xóa dữ liệu người đã phát sinh hóa đơn hoặc giao dịch.
- Thông tin cá nhân phải được giới hạn quyền truy cập.

## 3.5. MOD-05: Quản lý phí và chỉ số điện nước

### Loại phí

- Phí quản lý.
- Phí gửi xe.
- Phí điện.
- Phí nước.
- Phí vệ sinh.
- Phí sử dụng tiện ích.
- Phí dịch vụ khác.
- Khoản thu phát sinh.

### Cấu hình phí

Mỗi loại phí có:
- Tên khoản phí.
- Mã khoản phí.
- Loại tính phí.
- Đơn giá.
- Chu kỳ thu.
- Ngày bắt đầu áp dụng.
- Ngày kết thúc áp dụng.
- Đơn vị tính.
- Tòa nhà áp dụng.
- Điều kiện áp dụng.

### Phương pháp tính

| Loại phí | Phương pháp |
|---|---|
| Phí quản lý | Diện tích × Đơn giá/m² |
| Điện | Chỉ số mới - Chỉ số cũ × Đơn giá |
| Nước | Chỉ số mới - Chỉ số cũ × Đơn giá |
| Gửi xe | Số phương tiện × Đơn giá |
| Phí cố định | Số tiền cấu hình |
| Phí theo lượt | Số lượt × Đơn giá |

### Ghi nhận điện nước

Thông tin:
- Căn hộ.
- Loại đồng hồ.
- Chỉ số cũ.
- Chỉ số mới.
- Lượng tiêu thụ.
- Thời gian ghi nhận.
- Người ghi nhận.
- Hình ảnh đồng hồ.
- Nguồn dữ liệu: MANUAL hoặc IOT.
- Trạng thái xác nhận.

### Quy tắc

1. Chỉ số mới không được nhỏ hơn chỉ số cũ, trừ trường hợp thay đồng hồ hoặc điều chỉnh có phê duyệt.
2. Không cho phép ghi nhận trùng kỳ.
3. Mọi lần điều chỉnh phải lưu lịch sử.
4. Dữ liệu IoT cần được xác thực trước khi dùng để tính tiền.
5. Phải hỗ trợ nhập thủ công khi thiết bị không hoạt động.
6. Đơn giá phải được lưu theo thời gian áp dụng để không làm thay đổi hóa đơn cũ.

## 3.6. MOD-06: Hóa đơn và công nợ

### Chức năng

- Tạo kỳ thu phí.
- Tự động tạo hóa đơn cho căn hộ.
- Tính tổng phí.
- Xem chi tiết từng khoản.
- Phát hành hóa đơn.
- Gửi thông báo hóa đơn.
- Theo dõi trạng thái thanh toán.
- Ghi nhận công nợ.
- Điều chỉnh hóa đơn theo quy trình phê duyệt.
- Xuất hóa đơn hoặc báo cáo.

### Thông tin hóa đơn

- Mã hóa đơn.
- Căn hộ.
- Người thanh toán.
- Kỳ hóa đơn.
- Ngày phát hành.
- Hạn thanh toán.
- Danh sách khoản phí.
- Tổng tiền.
- Số tiền đã thanh toán.
- Số tiền còn nợ.
- Trạng thái.

### Trạng thái hóa đơn

- DRAFT.
- ISSUED.
- PARTIALLY_PAID.
- PAID.
- OVERDUE.
- CANCELLED.

### Quy tắc

- Hóa đơn đã phát hành không được sửa trực tiếp.
- Điều chỉnh phải có lý do và lịch sử.
- Tổng tiền phải được tính từ các dòng chi tiết.
- Không tạo hóa đơn trùng căn hộ và kỳ thu nếu nghiệp vụ không cho phép.
- Hỗ trợ thanh toán một phần.
- Không được ghi nhận thanh toán vượt số tiền còn phải trả nếu chưa có nghiệp vụ xử lý tiền thừa.

### Xử lý công nợ

- Tổng hợp công nợ theo căn hộ.
- Tổng hợp công nợ theo tòa nhà.
- Danh sách hóa đơn quá hạn.
- Lịch sử thanh toán.
- Nhắc thanh toán.
- Báo cáo tỷ lệ thu phí.

## 3.7. MOD-07: Thanh toán

### Chức năng

- Hiển thị số tiền cần thanh toán.
- Tạo yêu cầu thanh toán.
- Hiển thị mã QR thanh toán.
- Ghi nhận giao dịch.
- Xem lịch sử thanh toán.
- Xác nhận thanh toán.
- Xử lý giao dịch thất bại.
- Đối soát giao dịch.

### Phương thức

- Tiền mặt (nhân viên ghi nhận).
- Chuyển khoản ngân hàng.
- QR thanh toán.
- Cổng thanh toán bên thứ ba.

### Quy tắc

- Mỗi giao dịch có mã tham chiếu duy nhất.
- Không ghi nhận thanh toán thành công chỉ dựa trên nội dung do trình duyệt gửi lên.
- Giao dịch từ cổng thanh toán phải xác minh chữ ký hoặc cơ chế xác thực tương ứng.
- Webhook phải xử lý idempotency để tránh ghi nhận trùng.
- Giao dịch thất bại không được làm giảm công nợ.
- Giao dịch đã xác nhận cần có quy trình hoàn tiền hoặc điều chỉnh riêng.

Trong MVP có thể mô phỏng thanh toán bằng QR tĩnh hoặc trạng thái giao dịch giả lập. Phải phân biệt rõ dữ liệu demo với giao dịch thực.

## 3.8. MOD-08: Quản lý yêu cầu và bảo trì

### Cư dân gửi yêu cầu

Thông tin:
- Mã yêu cầu.
- Căn hộ.
- Người gửi.
- Loại yêu cầu.
- Tiêu đề.
- Nội dung.
- Hình ảnh đính kèm.
- Mức độ ưu tiên.
- Thời gian gửi.

### Loại yêu cầu

- Sửa chữa điện.
- Sửa chữa nước.
- Điều hòa.
- Thang máy.
- Vệ sinh.
- An ninh.
- Cơ sở vật chất.
- Phản ánh dịch vụ.
- Yêu cầu khác.

### Trạng thái

- SUBMITTED.
- RECEIVED.
- ASSIGNED.
- IN_PROGRESS.
- WAITING_RESIDENT.
- COMPLETED.
- REJECTED.
- CANCELLED.

### Quy trình xử lý

1. Cư dân gửi yêu cầu.
2. Hệ thống tạo mã yêu cầu.
3. Ban quản lý tiếp nhận.
4. Phân công nhân viên kỹ thuật.
5. Nhân viên cập nhật tiến độ.
6. Hoàn thành công việc.
7. Cư dân xác nhận hoặc phản hồi.
8. Hệ thống lưu lịch sử xử lý.

### Chức năng

- Danh sách yêu cầu.
- Lọc theo trạng thái.
- Phân công nhân viên.
- Cập nhật tiến độ.
- Trao đổi giữa cư dân và nhân viên.
- Đính kèm hình ảnh.
- Đánh giá sau xử lý.
- Báo cáo thời gian xử lý.

## 3.9. MOD-09: Thông báo

### Loại thông báo

- Thông báo phí.
- Thông báo hóa đơn.
- Thông báo thanh toán.
- Thông báo bảo trì.
- Thông báo sự cố.
- Thông báo chung.
- Thông báo khảo sát.
- Thông báo khẩn cấp.

### Chức năng

- Tạo thông báo.
- Chọn tòa nhà hoặc nhóm cư dân nhận.
- Gửi thông báo.
- Đánh dấu đã đọc.
- Xem lịch sử thông báo.
- Gửi thông báo tự động khi có sự kiện nghiệp vụ.

### Quy tắc

- Không gửi thông báo ngoài phạm vi đối tượng được chọn.
- Ghi nhận trạng thái đọc.
- Hỗ trợ thông báo theo căn hộ, tòa nhà hoặc toàn hệ thống.
- Không để người dùng thông thường phát hành thông báo khẩn cấp nếu không có quyền.

## 3.10. MOD-10: Quản lý phương tiện

### Thông tin phương tiện

- Chủ phương tiện.
- Căn hộ.
- Loại phương tiện.
- Biển số.
- Mã thẻ.
- Ngày đăng ký.
- Trạng thái.
- Ngày hết hạn (nếu có).

### Chức năng

- Đăng ký phương tiện.
- Duyệt đăng ký.
- Cập nhật thông tin.
- Ngừng sử dụng.
- Tra cứu phương tiện.
- Thống kê phương tiện theo tòa nhà.

## 3.11. MOD-11: Quản lý tiện ích chung

Ví dụ:
- Phòng sinh hoạt cộng đồng.
- Phòng tập gym.
- Hồ bơi.
- Sân thể thao.
- Khu vực tổ chức sự kiện.

### Chức năng

- Quản lý tiện ích.
- Cấu hình thời gian hoạt động.
- Cấu hình phí sử dụng.
- Đăng ký sử dụng.
- Duyệt đăng ký.
- Hủy đăng ký.
- Kiểm tra lịch trùng.
- Xem lịch sử sử dụng.

## 3.12. MOD-12: Phản ánh và khảo sát cư dân

### Chức năng

- Tạo khảo sát.
- Gửi khảo sát đến cư dân.
- Cho phép gửi ý kiến.
- Cho phép biểu quyết theo quyền được cấp.
- Tổng hợp kết quả.
- Xuất báo cáo.

### Quy tắc

- Mỗi khảo sát có thời gian bắt đầu và kết thúc.
- Kiểm tra quyền tham gia.
- Chống gửi nhiều phản hồi nếu khảo sát chỉ cho phép một lần.
- Kết quả cần lưu dấu thời gian và đối tượng tham gia.
- Không tự động coi biểu quyết trực tuyến là quyết định có giá trị pháp lý.

## 3.13. MOD-13: Dashboard và báo cáo

### Dashboard Ban quản lý

Các chỉ số:
- Tổng số tòa nhà.
- Tổng số căn hộ.
- Số căn hộ đang có người cư trú.
- Tỷ lệ lấp đầy.
- Tổng hóa đơn kỳ hiện tại.
- Tổng số tiền đã thu.
- Tổng công nợ.
- Số hóa đơn quá hạn.
- Số yêu cầu đang xử lý.
- Số yêu cầu quá hạn.
- Mức tiêu thụ điện nước.

### Báo cáo

- Báo cáo căn hộ.
- Báo cáo cư dân.
- Báo cáo thu phí.
- Báo cáo công nợ.
- Báo cáo điện nước.
- Báo cáo bảo trì.
- Báo cáo phương tiện.
- Báo cáo mức độ sử dụng tiện ích.

### Dashboard cư dân

- Thông tin căn hộ.
- Hóa đơn chưa thanh toán.
- Lịch sử thanh toán.
- Thông báo mới.
- Yêu cầu bảo trì.
- Tiến độ yêu cầu.
- Đăng ký tiện ích.

### Yêu cầu

- Có bộ lọc theo tòa nhà và khoảng thời gian.
- Số liệu phải lấy từ dữ liệu nghiệp vụ.
- Không hiển thị dữ liệu vượt quyền.
- Có thể xuất Excel hoặc PDF ở giai đoạn mở rộng.

## 3.14. MOD-14: IoT điện nước

### Mục tiêu

Cho phép tiếp nhận dữ liệu từ đồng hồ điện, nước hoặc thiết bị IoT.

### Kiến trúc tham khảo

ESP32 → MQTT Broker → Backend IoT Service → Validation → Database → Dashboard.

### Dữ liệu

- Device ID.
- Apartment ID.
- Meter Type.
- Meter Value.
- Timestamp.
- Device Status.
- Signal Quality.

### Chức năng

- Đăng ký thiết bị.
- Gán thiết bị vào căn hộ.
- Nhận dữ liệu.
- Kiểm tra dữ liệu bất thường.
- Lưu lịch sử đo.
- Hiển thị biểu đồ.
- Cảnh báo thiết bị mất kết nối.

### Yêu cầu bảo mật

- Mỗi thiết bị phải có thông tin xác thực.
- Không chấp nhận thiết bị không được đăng ký.
- Kiểm tra tính hợp lệ của dữ liệu.
- Không cho phép thiết bị trực tiếp tạo hóa đơn.
- Dữ liệu đo phải được kiểm tra và xác nhận trước khi sử dụng để tính phí.

Nếu không có thiết bị thật, có thể sử dụng chương trình giả lập gửi dữ liệu MQTT.

## 3.15. MOD-15: AI và phân tích dữ liệu

Đây là phân hệ mở rộng, không được làm ảnh hưởng các nghiệp vụ cốt lõi.

### Các tính năng đề xuất

1. Phân tích mức tiêu thụ điện nước.
2. Phát hiện mức tiêu thụ bất thường.
3. Dự báo nhu cầu bảo trì.
4. Phân tích tỷ lệ thu phí.
5. Trợ lý AI hỗ trợ tra cứu thông tin vận hành.

### AI Assistant

Cho phép người dùng đặt câu hỏi như:
- Tòa nhà nào có nhiều hóa đơn quá hạn nhất?
- Căn hộ nào có mức tiêu thụ điện tăng bất thường?
- Có bao nhiêu yêu cầu bảo trì chưa hoàn thành?
- Tổng số tiền đã thu trong tháng này là bao nhiêu?

### Quy tắc

- AI chỉ được truy cập dữ liệu trong phạm vi quyền của người dùng.
- Không để AI tự ý thay đổi dữ liệu nghiệp vụ.
- Các thao tác ghi dữ liệu phải thông qua API và xác nhận của người dùng.
- Câu trả lời phải dựa trên dữ liệu hệ thống.
- Khi không đủ dữ liệu, AI phải thông báo không đủ thông tin.
- Không gửi thông tin cá nhân hoặc dữ liệu nhạy cảm đến dịch vụ AI bên ngoài nếu chưa có cơ chế bảo vệ phù hợp.

## 3.16. MOD-16: Nhật ký hoạt động

Ghi nhận các hành động quan trọng:

- Đăng nhập và đăng xuất.
- Tạo, sửa, khóa tài khoản.
- Thay đổi quyền.
- Thay đổi thông tin căn hộ.
- Thay đổi chủ sở hữu hoặc cư dân.
- Điều chỉnh chỉ số điện nước.
- Phát hành hóa đơn.
- Xác nhận thanh toán.
- Hủy hoặc điều chỉnh giao dịch.
- Phê duyệt yêu cầu.
- Thay đổi cấu hình phí.

Thông tin nhật ký:
- User ID.
- Action.
- Entity Type.
- Entity ID.
- Thời gian.
- IP (nếu có).
- Giá trị trước thay đổi.
- Giá trị sau thay đổi.
- Lý do.

Nhật ký phải được bảo vệ khỏi việc sửa hoặc xóa tùy tiện.

---

# 4. QUY TRÌNH NGHIỆP VỤ CHÍNH

## 4.1. Quy trình quản lý căn hộ

1. Quản trị viên tạo tòa nhà.
2. Tạo khối nhà và tầng.
3. Tạo danh sách căn hộ.
4. Cập nhật thông tin căn hộ.
5. Gán chủ sở hữu.
6. Gán cư dân.
7. Cập nhật trạng thái sử dụng.
8. Lưu lịch sử thay đổi.

## 4.2. Quy trình lập hóa đơn

1. Kế toán tạo kỳ thu phí.
2. Hệ thống lấy cấu hình phí.
3. Lấy diện tích căn hộ.
4. Lấy dữ liệu điện nước.
5. Lấy thông tin phương tiện và dịch vụ phát sinh.
6. Tính các khoản phí.
7. Tạo hóa đơn nháp.
8. Kế toán kiểm tra.
9. Phát hành hóa đơn.
10. Hệ thống gửi thông báo đến cư dân.
11. Cư dân thanh toán.
12. Hệ thống cập nhật công nợ.

## 4.3. Quy trình thanh toán

1. Cư dân chọn hóa đơn.
2. Hệ thống hiển thị số tiền cần thanh toán.
3. Cư dân chọn phương thức thanh toán.
4. Hệ thống tạo giao dịch.
5. Nhà cung cấp thanh toán trả kết quả hoặc nhân viên xác nhận giao dịch.
6. Backend xác minh kết quả.
7. Ghi nhận giao dịch.
8. Cập nhật số tiền đã thanh toán.
9. Cập nhật trạng thái hóa đơn.
10. Gửi thông báo.

## 4.4. Quy trình bảo trì

1. Cư dân tạo yêu cầu.
2. Hệ thống ghi nhận.
3. Nhân viên tiếp nhận.
4. Ban quản lý phân công.
5. Nhân viên kỹ thuật xử lý.
6. Cập nhật tiến độ.
7. Hoàn thành.
8. Cư dân xác nhận.
9. Lưu lịch sử và đánh giá.

## 4.5. Quy trình thay đổi cư dân

1. Chủ sở hữu hoặc nhân viên có quyền gửi yêu cầu thay đổi.
2. Cung cấp thông tin người chuyển đi và người chuyển đến.
3. Kiểm tra quyền sở hữu hoặc hợp đồng thuê.
4. Phê duyệt theo quy trình.
5. Kết thúc quan hệ cư trú cũ.
6. Tạo quan hệ cư trú mới.
7. Cập nhật quyền truy cập.
8. Ghi nhận lịch sử.

---

# 5. YÊU CẦU PHI CHỨC NĂNG

## 5.1. Hiệu năng

- API thông thường hướng đến thời gian phản hồi dưới 500 ms trong điều kiện thử nghiệm phù hợp.
- Danh sách dữ liệu phải hỗ trợ phân trang.
- Có bộ lọc và tìm kiếm phía Backend.
- Không truy vấn toàn bộ dữ liệu lớn về Frontend.
- Các báo cáo nặng cần được tối ưu hoặc xử lý bất đồng bộ.

Các chỉ tiêu trên là mục tiêu thiết kế, cần đo thực tế khi kiểm thử.

## 5.2. Bảo mật

- Mật khẩu phải được hash bằng thuật toán phù hợp.
- Sử dụng HTTPS khi triển khai.
- Kiểm tra dữ liệu đầu vào.
- Chống SQL Injection.
- Chống truy cập trái phép.
- Phân quyền tại Backend.
- Giới hạn kích thước và loại file upload.
- Không lưu mật khẩu hoặc secret trong source code.
- Sử dụng biến môi trường cho cấu hình nhạy cảm.
- Có cơ chế giới hạn số lần đăng nhập.
- Không trả về dữ liệu cá nhân không cần thiết.

## 5.3. Tính toàn vẹn dữ liệu

- Sử dụng transaction cho nghiệp vụ tài chính.
- Có ràng buộc khóa ngoại.
- Có unique constraint phù hợp.
- Hạn chế xóa cứng dữ liệu nghiệp vụ.
- Lưu lịch sử điều chỉnh.
- Không để giao dịch thanh toán bị ghi nhận trùng.

## 5.4. Khả năng mở rộng

- Có thể bổ sung nhiều tòa nhà.
- Có thể thêm loại phí mới.
- Có thể tích hợp cổng thanh toán.
- Có thể tích hợp thiết bị IoT.
- Có thể bổ sung ứng dụng mobile.
- Có thể mở rộng sang các dịch vụ quản lý tài sản khác.

## 5.5. Khả năng sử dụng

- Giao diện tiếng Việt.
- Responsive.
- Có trạng thái loading, empty, error.
- Có thông báo thành công và thất bại.
- Có xác nhận đối với thao tác quan trọng.
- Có phân trang và tìm kiếm.
- Có hỗ trợ bàn phím và khả năng truy cập cơ bản.

---

# 6. KIẾN TRÚC CÔNG NGHỆ ĐỀ XUẤT

## 6.1. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Angular + TypeScript |
| UI | Angular Material hoặc bộ UI nhất quán |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migration | Alembic |
| Authentication | JWT Access/Refresh Token |
| Cache | Redis (khi cần) |
| Realtime | WebSocket |
| IoT | MQTT / Mosquitto |
| Data Analysis | Pandas, NumPy, Scikit-learn |
| Charts | Chart.js hoặc thư viện tương đương |
| API Documentation | OpenAPI / Swagger |
| Testing | Pytest, HTTPX, Angular Testing |
| Deployment | Docker, Docker Compose, Nginx |
| Version Control | Git |

## 6.2. Kiến trúc tổng thể

Sử dụng kiến trúc Modular Monolith.

Frontend Angular giao tiếp với Backend FastAPI thông qua REST API.

Backend được chia thành các module độc lập theo nghiệp vụ:
- Auth.
- Organizations.
- Buildings.
- Apartments.
- Residents.
- Fees.
- Invoices.
- Payments.
- Maintenance.
- Notifications.
- Vehicles.
- Amenities.
- Reports.
- IoT.
- Audit Logs.

Không tách Microservices ở giai đoạn đầu nếu chưa có nhu cầu thực tế.

## 6.3. Cấu trúc thư mục đề xuất

```text
smart-apartment/
├── docs/
│   ├── README.md
│   ├── project-overview.md
│   ├── requirements.md
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-specification.md
│   ├── business-rules.md
│   ├── authorization-matrix.md
│   ├── development-roadmap.md
│   ├── testing-strategy.md
│   ├── deployment-guide.md
│   ├── decisions.md
│   ├── issues.md
│   ├── progress.md
│   └── task-board.md
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── common/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── organizations/
│   │   │   ├── buildings/
│   │   │   ├── apartments/
│   │   │   ├── residents/
│   │   │   ├── fees/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── maintenance/
│   │   │   ├── notifications/
│   │   │   ├── vehicles/
│   │   │   ├── amenities/
│   │   │   ├── reports/
│   │   │   ├── iot/
│   │   │   └── audit_logs/
│   │   ├── database/
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   ├── shared/
│   │   │   ├── layouts/
│   │   │   ├── features/
│   │   │   └── app.routes.ts
│   │   └── assets/
│   ├── angular.json
│   └── Dockerfile
│
├── iot-simulator/
├── scripts/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Cấu trúc có thể điều chỉnh sau khi Agent khảo sát repository hiện tại. Không tạo lại dự án nếu repository đã có cấu trúc tương đương.

---

# 7. THIẾT KẾ CƠ SỞ DỮ LIỆU ĐỊNH HƯỚNG

## 7.1. Nhóm xác thực và phân quyền

- users
- roles
- permissions
- user_roles
- role_permissions
- user_building_access
- refresh_tokens

## 7.2. Nhóm tổ chức và tài sản

- organizations
- buildings
- building_blocks
- floors
- apartments
- apartment_images

## 7.3. Nhóm chủ sở hữu và cư dân

- persons
- apartment_ownerships
- apartment_residencies
- rental_contracts
- resident_documents

## 7.4. Nhóm phí và hóa đơn

- fee_types
- fee_configurations
- meter_devices
- meter_readings
- billing_periods
- invoices
- invoice_items
- payments
- payment_transactions

## 7.5. Nhóm bảo trì

- maintenance_requests
- maintenance_assignments
- maintenance_comments
- maintenance_attachments
- maintenance_ratings

## 7.6. Nhóm thông báo và tiện ích

- notifications
- notification_recipients
- vehicles
- amenities
- amenity_bookings
- surveys
- survey_responses

## 7.7. Nhóm IoT và nhật ký

- iot_devices
- iot_readings
- iot_alerts
- audit_logs

## 7.8. Quy tắc thiết kế Database

1. Sử dụng UUID hoặc ID nhất quán cho các bảng.
2. Có created_at và updated_at cho dữ liệu nghiệp vụ.
3. Các bảng quan trọng cần created_by và updated_by khi phù hợp.
4. Sử dụng khóa ngoại.
5. Tạo index cho các trường tìm kiếm phổ biến.
6. Không lưu danh sách ID dưới dạng chuỗi nếu cần quan hệ nhiều-nhiều.
7. Không lưu tổng tiền hóa đơn theo cách khiến dữ liệu chi tiết và tổng tiền không đồng nhất.
8. Phân biệt dữ liệu giao dịch với dữ liệu cấu hình.
9. Dữ liệu tài chính cần lưu dấu vết thay đổi.
10. Thiết kế quan hệ sở hữu và cư trú có ngày hiệu lực.
11. Có cơ chế soft delete hoặc trạng thái ngừng hoạt động cho dữ liệu cần bảo toàn lịch sử.

Đây là danh sách bảng định hướng, Agent phải xây dựng ERD và kiểm tra các quan hệ trước khi tạo migration. Không được tạo toàn bộ bảng một cách máy móc mà không phân tích nghiệp vụ.

---

# 8. API SPECIFICATION ĐỊNH HƯỚNG

API sử dụng REST, JSON và version prefix `/api/v1`.

## 8.1. Auth

```http
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

## 8.2. Buildings

```http
GET    /api/v1/buildings
POST   /api/v1/buildings
GET    /api/v1/buildings/{id}
PATCH  /api/v1/buildings/{id}
GET    /api/v1/buildings/{id}/statistics
```

## 8.3. Apartments

```http
GET    /api/v1/apartments
POST   /api/v1/apartments
GET    /api/v1/apartments/{id}
PATCH  /api/v1/apartments/{id}
GET    /api/v1/apartments/{id}/residents
GET    /api/v1/apartments/{id}/invoices
GET    /api/v1/apartments/{id}/maintenance-requests
```

## 8.4. Residents

```http
GET    /api/v1/residents
POST   /api/v1/residents
GET    /api/v1/residents/{id}
PATCH  /api/v1/residents/{id}
POST   /api/v1/apartments/{id}/residents
DELETE /api/v1/apartments/{id}/residents/{resident_id}
```

Việc kết thúc quan hệ cư trú nên được xử lý bằng nghiệp vụ có ngày kết thúc, không xóa lịch sử.

## 8.5. Fees and Meter Readings

```http
GET    /api/v1/fee-types
POST   /api/v1/fee-types
POST   /api/v1/fee-configurations
GET    /api/v1/meter-readings
POST   /api/v1/meter-readings
GET    /api/v1/apartments/{id}/meter-readings
```

## 8.6. Invoices and Payments

```http
GET    /api/v1/invoices
POST   /api/v1/invoices/generate
GET    /api/v1/invoices/{id}
POST   /api/v1/invoices/{id}/issue
POST   /api/v1/invoices/{id}/adjust
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/{id}
```

## 8.7. Maintenance

```http
GET    /api/v1/maintenance-requests
POST   /api/v1/maintenance-requests
GET    /api/v1/maintenance-requests/{id}
PATCH  /api/v1/maintenance-requests/{id}
POST   /api/v1/maintenance-requests/{id}/assign
POST   /api/v1/maintenance-requests/{id}/comments
POST   /api/v1/maintenance-requests/{id}/complete
```

## 8.8. Notifications and Reports

```http
GET    /api/v1/notifications
POST   /api/v1/notifications
PATCH  /api/v1/notifications/{id}/read

GET    /api/v1/reports/overview
GET    /api/v1/reports/revenue
GET    /api/v1/reports/debts
GET    /api/v1/reports/consumption
GET    /api/v1/reports/maintenance
```

## 8.9. Quy ước API

- Sử dụng HTTP status code đúng ngữ nghĩa.
- Có validation cho request.
- Có response schema thống nhất.
- Có phân trang.
- Có lọc và sắp xếp.
- Có xử lý lỗi tập trung.
- Có xác thực và phân quyền.
- Có tài liệu OpenAPI.
- Không trả stack trace hoặc thông tin nhạy cảm cho Client.

Response danh sách đề xuất:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

Response lỗi đề xuất:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  }
}
```

---

# 9. GIAO DIỆN NGƯỜI DÙNG

## 9.1. Management Portal

### Các trang

1. Login.
2. Dashboard.
3. Quản lý tổ chức.
4. Quản lý tòa nhà.
5. Quản lý khối nhà và tầng.
6. Quản lý căn hộ.
7. Quản lý chủ sở hữu.
8. Quản lý cư dân.
9. Quản lý nhân viên.
10. Quản lý loại phí.
11. Cấu hình phí.
12. Ghi nhận điện nước.
13. Quản lý kỳ thu.
14. Quản lý hóa đơn.
15. Quản lý thanh toán.
16. Quản lý công nợ.
17. Quản lý bảo trì.
18. Quản lý phương tiện.
19. Quản lý tiện ích.
20. Quản lý thông báo.
21. Báo cáo.
22. Nhật ký hoạt động.
23. Cài đặt tài khoản.

## 9.2. Resident Portal

### Các trang

1. Login.
2. Dashboard cư dân.
3. Thông tin cá nhân.
4. Thông tin căn hộ.
5. Hóa đơn.
6. Chi tiết hóa đơn.
7. Thanh toán.
8. Lịch sử thanh toán.
9. Thông báo.
10. Yêu cầu bảo trì.
11. Chi tiết yêu cầu bảo trì.
12. Đăng ký phương tiện.
13. Đăng ký tiện ích.
14. Phản ánh.
15. Khảo sát.

## 9.3. Yêu cầu UI/UX

- Thiết kế hiện đại, chuyên nghiệp, phù hợp nền tảng quản trị.
- Ưu tiên tính dễ sử dụng hơn hiệu ứng trang trí.
- Sidebar cho Management Portal.
- Navigation rõ ràng cho Resident Portal.
- Responsive trên desktop, tablet và mobile.
- Bảng dữ liệu hỗ trợ tìm kiếm, lọc, phân trang.
- Form có validation.
- Có trạng thái loading, empty, error.
- Có modal xác nhận thao tác quan trọng.
- Sử dụng màu sắc nhất quán cho trạng thái.
- Không sử dụng dữ liệu giả cố định trong các trang đã kết nối API.
- Không để các nút bấm không có chức năng thực tế.

---

# 10. SEED DATA VÀ KỊCH BẢN DEMO

Agent cần tạo dữ liệu mẫu để kiểm thử toàn bộ hệ thống.

## 10.1. Dữ liệu mẫu

- 1 tổ chức quản lý.
- 2 tòa nhà.
- Mỗi tòa nhà có 2 khối.
- Mỗi khối có 5 tầng.
- Mỗi tầng có 4 căn hộ.
- Một số căn hộ có chủ sở hữu và người thuê.
- Tài khoản cho từng vai trò.
- Các loại phí.
- Chỉ số điện nước.
- Hóa đơn nhiều trạng thái.
- Giao dịch thanh toán.
- Yêu cầu bảo trì.
- Thông báo.
- Phương tiện.

Dữ liệu mẫu phải có tính liên kết và hợp lý về mặt nghiệp vụ.

## 10.2. Tài khoản demo

Tạo tài khoản cho:
- System Admin.
- Building Manager.
- Accountant.
- Technician.
- Security.
- Board Member.
- Apartment Owner.
- Resident.

Thông tin đăng nhập chỉ sử dụng cho môi trường demo. Không đưa mật khẩu mặc định vào môi trường production.

## 10.3. Kịch bản trình diễn

### Kịch bản 1: Quản lý căn hộ

Admin tạo tòa nhà → Tạo tầng → Tạo căn hộ → Gán chủ sở hữu → Gán cư dân.

### Kịch bản 2: Tính phí

Kế toán cấu hình phí → Nhập điện nước → Tạo kỳ thu → Sinh hóa đơn → Phát hành.

### Kịch bản 3: Thanh toán

Cư dân đăng nhập → Xem hóa đơn → Tạo giao dịch → Thanh toán mô phỏng → Xem lịch sử.

### Kịch bản 4: Bảo trì

Cư dân gửi yêu cầu → Ban quản lý tiếp nhận → Phân công kỹ thuật → Cập nhật tiến độ → Hoàn thành.

### Kịch bản 5: Dashboard

Ban quản lý xem tỷ lệ lấp đầy, doanh thu, công nợ, tình trạng bảo trì và mức tiêu thụ điện nước.

### Kịch bản 6: IoT

Thiết bị giả lập gửi dữ liệu MQTT → Backend tiếp nhận → Kiểm tra → Lưu dữ liệu → Dashboard hiển thị.

---

# 11. KẾ HOẠCH TRIỂN KHAI

## Giai đoạn 1: Phân tích và thiết kế

- Khảo sát repository.
- Xác định phạm vi MVP.
- Phân tích nghiệp vụ.
- Xây dựng use case.
- Thiết kế ERD.
- Thiết kế kiến trúc.
- Xây dựng API contract.
- Thiết kế giao diện.

**Đầu ra:** Tài liệu thiết kế và kế hoạch task.

## Giai đoạn 2: Nền tảng hệ thống

- Khởi tạo Backend.
- Khởi tạo Frontend.
- Kết nối PostgreSQL.
- Xây dựng migration.
- Xây dựng authentication.
- Xây dựng RBAC.
- Xây dựng layout và routing.

**Đầu ra:** Hệ thống đăng nhập và phân quyền hoạt động.

## Giai đoạn 3: Quản lý tòa nhà và cư dân

- Tổ chức.
- Tòa nhà.
- Khối nhà.
- Tầng.
- Căn hộ.
- Chủ sở hữu.
- Cư dân.
- Quan hệ sở hữu và cư trú.

**Đầu ra:** Quản lý được cấu trúc và người sử dụng chung cư.

## Giai đoạn 4: Phí, hóa đơn và thanh toán

- Loại phí.
- Cấu hình phí.
- Ghi nhận điện nước.
- Kỳ thu phí.
- Tạo hóa đơn.
- Công nợ.
- Thanh toán mô phỏng.
- Lịch sử giao dịch.

**Đầu ra:** Hoàn chỉnh quy trình thu phí.

## Giai đoạn 5: Vận hành và cư dân

- Yêu cầu bảo trì.
- Phân công kỹ thuật.
- Thông báo.
- Phương tiện.
- Tiện ích.
- Resident Portal.

**Đầu ra:** Cư dân có thể tương tác với Ban quản lý.

## Giai đoạn 6: Dashboard và báo cáo

- Dashboard tổng quan.
- Báo cáo doanh thu.
- Báo cáo công nợ.
- Báo cáo điện nước.
- Báo cáo bảo trì.

**Đầu ra:** Theo dõi và đánh giá vận hành.

## Giai đoạn 7: IoT và AI

- MQTT Broker.
- IoT Simulator.
- Nhận dữ liệu điện nước.
- Phát hiện bất thường cơ bản.
- AI Assistant tra cứu dữ liệu.

**Đầu ra:** Chứng minh khả năng mở rộng chuyển đổi số.

## Giai đoạn 8: Kiểm thử và triển khai

- Unit Test.
- Integration Test.
- API Test.
- Authorization Test.
- UI Test.
- Kiểm thử quy trình nghiệp vụ.
- Docker hóa.
- Viết hướng dẫn triển khai.
- Hoàn thiện báo cáo.

**Đầu ra:** Phiên bản có thể chạy demo và bàn giao.

---

# 12. TIÊU CHÍ NGHIỆM THU

## 12.1. Authentication và Authorization

- Người dùng đăng nhập được.
- Token hoạt động đúng.
- Không truy cập được API trái quyền.
- Không xem được dữ liệu tòa nhà ngoài phạm vi.
- Các vai trò có quyền khác nhau.

## 12.2. Quản lý dữ liệu

- Tạo, xem, cập nhật dữ liệu tòa nhà.
- Quản lý căn hộ.
- Gán chủ sở hữu và cư dân.
- Lưu lịch sử cư trú.
- Tìm kiếm và phân trang.

## 12.3. Hóa đơn

- Tính đúng phí quản lý.
- Tính đúng điện nước.
- Sinh hóa đơn đúng kỳ.
- Không tạo hóa đơn trùng.
- Tính đúng số tiền còn nợ.
- Hỗ trợ thanh toán một phần.

## 12.4. Bảo trì

- Cư dân gửi yêu cầu.
- Nhân viên được phân công.
- Trạng thái được cập nhật.
- Lịch sử được lưu.
- Cư dân xem được tiến độ.

## 12.5. Dashboard

- Dữ liệu thống kê lấy từ Database.
- Số liệu nhất quán với dữ liệu nghiệp vụ.
- Không hiển thị dữ liệu ngoài quyền.
- Có bộ lọc thời gian và tòa nhà.

## 12.6. Chất lượng kỹ thuật

- Backend có kiểm thử.
- Frontend không có lỗi nghiêm trọng.
- Migration chạy được trên Database mới.
- API có tài liệu.
- Có file `.env.example`.
- Docker Compose khởi chạy được.
- Có README hướng dẫn cài đặt và chạy dự án.

---

# 13. QUY ĐỊNH LÀM VIỆC DÀNH CHO AI AGENT

Đây là phần bắt buộc Agent phải tuân thủ trong suốt quá trình triển khai.

## 13.1. Vai trò của Agent

Agent đóng vai trò:
- Software Architect.
- Business Analyst.
- Backend Developer.
- Frontend Developer.
- Database Designer.
- QA Engineer.
- Technical Writer.

Agent phải chủ động phân tích và triển khai theo từng giai đoạn, không chỉ tạo code theo yêu cầu đơn lẻ.

## 13.2. Trước khi viết code

Bắt buộc:

1. Đọc toàn bộ tài liệu trong `docs/`.
2. Kiểm tra cấu trúc repository.
3. Kiểm tra công nghệ đang sử dụng.
4. Kiểm tra các chức năng đã có.
5. Kiểm tra trạng thái Git.
6. Kiểm tra các migration hiện có.
7. Xác định phần cần bổ sung và phần cần sửa.
8. Cập nhật task board.
9. Đưa ra kế hoạch trước khi triển khai task lớn.

Không tự ý xóa hoặc viết lại cấu trúc dự án hiện có nếu chưa có lý do rõ ràng.

## 13.3. Quy tắc triển khai

- Ưu tiên hoàn thiện nghiệp vụ cốt lõi trước.
- Không tạo chức năng chỉ để giao diện có vẻ hoàn chỉnh.
- Không hardcode dữ liệu nghiệp vụ.
- Không tạo API giả để thay thế API thực.
- Không bỏ qua phân quyền.
- Không viết toàn bộ ứng dụng vào một file.
- Tách module theo nghiệp vụ.
- Tái sử dụng component và service.
- Có validation ở cả Frontend và Backend.
- Có xử lý lỗi.
- Có loading và empty state.
- Có kiểm thử các nghiệp vụ quan trọng.
- Không tự ý thêm công nghệ nếu chưa có lý do.
- Không tự ý thay đổi database schema mà không cập nhật migration và tài liệu.
- Không để secret hoặc thông tin nhạy cảm trong source code.
- Không tuyên bố chức năng đã hoàn thành khi chưa kiểm tra.

## 13.4. Quy trình hoàn thành một task

Mỗi task phải thực hiện theo thứ tự:

1. Phân tích yêu cầu.
2. Kiểm tra code liên quan.
3. Xác định file cần tạo hoặc sửa.
4. Kiểm tra ảnh hưởng đến các module khác.
5. Triển khai Backend nếu cần.
6. Triển khai Frontend nếu cần.
7. Cập nhật Database nếu cần.
8. Viết hoặc cập nhật test.
9. Chạy test.
10. Kiểm tra lỗi.
11. Cập nhật tài liệu.
12. Cập nhật task board.
13. Tổng kết kết quả.

## 13.5. Definition of Done

Một task chỉ được đánh dấu DONE khi:

- Chức năng được triển khai đúng yêu cầu.
- API hoạt động nếu có.
- Giao diện hoạt động nếu có.
- Có kiểm tra quyền.
- Có validation.
- Không có lỗi nghiêm trọng.
- Test liên quan đã chạy thành công.
- Tài liệu được cập nhật.
- Không làm hỏng chức năng hiện có.

Nếu chưa đủ điều kiện, phải đánh dấu IN_PROGRESS hoặc BLOCKED.

## 13.6. Quy định cập nhật context

Duy trì các tài liệu:

| File | Nội dung |
|---|---|
| docs/project-overview.md | Tổng quan dự án |
| docs/architecture.md | Kiến trúc hệ thống |
| docs/database-design.md | Thiết kế Database |
| docs/api-specification.md | Đặc tả API |
| docs/business-rules.md | Quy tắc nghiệp vụ |
| docs/authorization-matrix.md | Ma trận phân quyền |
| docs/development-roadmap.md | Lộ trình |
| docs/task-board.md | Danh sách task |
| docs/progress.md | Tiến độ |
| docs/issues.md | Lỗi và vấn đề |
| docs/decisions.md | Quyết định kỹ thuật |
| docs/changelog.md | Lịch sử thay đổi |

Khi kết thúc phiên làm việc, Agent phải:
- Cập nhật tiến độ.
- Ghi lại task đã hoàn thành.
- Ghi lại task còn dang dở.
- Ghi lại lỗi và vấn đề.
- Ghi lại quyết định kỹ thuật.
- Ghi lại lệnh chạy và kiểm thử.
- Ghi rõ bước tiếp theo.

## 13.7. Phối hợp nhiều Agent

Nếu có nhiều Agent:

- Agent Architect: Kiến trúc, phân tích nghiệp vụ, API contract.
- Agent Backend: API, database, nghiệp vụ.
- Agent Frontend: UI, routing, state management.
- Agent QA: Test, kiểm thử tích hợp và phân quyền.
- Agent Reviewer: Review code, kiểm tra tiêu chí nghiệm thu.

Không để nhiều Agent chỉnh sửa cùng một file hoặc cùng một module mà không có phân công rõ ràng.

Các API contract và database schema phải được thống nhất trước khi Backend và Frontend triển khai song song.

---

# 14. YÊU CẦU ĐẦU RA CUỐI CÙNG

Khi hoàn thành dự án, cần có:

1. Source code Backend.
2. Source code Frontend.
3. Database schema và migration.
4. API documentation.
5. Tài liệu kiến trúc.
6. Tài liệu nghiệp vụ.
7. Hướng dẫn cài đặt.
8. Hướng dẫn chạy bằng Docker.
9. Seed data.
10. Tài khoản demo.
11. Test report.
12. Ảnh chụp giao diện.
13. Báo cáo kết quả thực hiện.
14. Danh sách chức năng hoàn thành và chưa hoàn thành.
15. Video hoặc kịch bản demo.

---

# 15. ĐỊNH HƯỚNG PHÁT TRIỂN SAU MVP

Sau khi hoàn thành các nghiệp vụ cơ bản, có thể mở rộng:

- Mobile App dành cho cư dân.
- IoT Smart Meter.
- QR Payment và đối soát tự động.
- Hệ thống kiểm soát ra vào.
- AI Assistant.
- Phân tích bất thường điện nước.
- Dự báo bảo trì.
- Digital Twin 2D.
- Quản lý nhiều tổ chức theo mô hình SaaS.
- Tích hợp hệ thống kế toán và dịch vụ bên ngoài.

**Nguyên tắc:** Chỉ triển khai các chức năng nâng cao sau khi nền tảng quản lý tòa nhà, căn hộ, cư dân, hóa đơn, thanh toán và bảo trì hoạt động ổn định.

---

# 16. ĐỊNH HƯỚNG ƯU TIÊN MVP

Để tránh dự án quá lớn, phiên bản đầu tiên cần tập trung vào 7 nghiệp vụ:

1. Đăng nhập và phân quyền.
2. Quản lý tòa nhà, tầng và căn hộ.
3. Quản lý chủ sở hữu và cư dân.
4. Quản lý phí, điện nước và hóa đơn.
5. Quản lý thanh toán và công nợ.
6. Quản lý yêu cầu bảo trì.
7. Dashboard và thông báo.

IoT, AI, quản lý tiện ích nâng cao và Digital Twin được phát triển sau.

**Mục tiêu cuối cùng:** Xây dựng một sản phẩm chạy được, có dữ liệu liên kết thực tế, nghiệp vụ hoàn chỉnh, phân quyền đúng và chứng minh được hiệu quả số hóa quy trình vận hành chung cư; không chỉ là một giao diện CRUD.