<?php
/**
 * SmartCondo - Dữ liệu Mockup Mẫu (PHP)
 * 
 * Bộ dữ liệu mẫu đầy đủ, tường minh và dễ đọc để phục vụ kiểm thử giao diện Frontend (FE).
 * Các thực thể, mã định danh và cấu trúc trường đồng bộ 100% với Backend Node.js / PostgreSQL.
 */

return [
    // =========================================================================
    // 1. TỔ CHỨC & TÒA NHÀ
    // =========================================================================
    'organizations' => [
        [
            'id' => 'org-001',
            'code' => 'SMARTCONDO-CORP',
            'name' => 'Công ty Cổ phần Quản lý Bất động sản SmartCondo',
            'created_at' => '2026-01-01T00:00:00Z',
        ],
    ],

    'buildings' => [
        [
            'id' => 'bld-001',
            'organization_id' => 'org-001',
            'code' => 'SKY-TOWER',
            'name' => 'Tòa nhà Sky Tower',
            'address' => '123 Đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
            'status' => 'ACTIVE',
            'created_at' => '2026-01-01T00:00:00Z',
        ],
    ],

    // =========================================================================
    // 2. KHỐI NHÀ (BLOCKS) & TẦNG (FLOORS)
    // =========================================================================
    'blocks' => [
        [
            'id' => 'blk-001',
            'building_id' => 'bld-001',
            'code' => 'A',
            'name' => 'Khối A (Tháp Ruby)',
            'floors' => [
                ['id' => 'flr-a01', 'floorNumber' => 1, 'name' => 'Tầng 1 (Khu A)'],
                ['id' => 'flr-a02', 'floorNumber' => 2, 'name' => 'Tầng 2 (Khu A)'],
                ['id' => 'flr-a03', 'floorNumber' => 3, 'name' => 'Tầng 3 (Khu A)'],
            ],
        ],
        [
            'id' => 'blk-002',
            'building_id' => 'bld-001',
            'code' => 'B',
            'name' => 'Khối B (Tháp Sapphire)',
            'floors' => [
                ['id' => 'flr-b01', 'floorNumber' => 1, 'name' => 'Tầng 1 (Khu B)'],
                ['id' => 'flr-b02', 'floorNumber' => 2, 'name' => 'Tầng 2 (Khu B)'],
            ],
        ],
    ],

    // =========================================================================
    // 3. CĂN HỘ (APARTMENTS)
    // =========================================================================
    'apartments' => [
        [
            'id' => 'apt-001',
            'floor_id' => 'flr-a01',
            'code' => 'A-101',
            'area_sqm' => '75.50',
            'bedroom_count' => 2,
            'bathroom_count' => 2,
            'operational_status' => 'ACTIVE',
            'floor_number' => 1,
            'block_id' => 'blk-001',
            'block_name' => 'Khối A (Tháp Ruby)',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
        ],
        [
            'id' => 'apt-002',
            'floor_id' => 'flr-a01',
            'code' => 'A-102',
            'area_sqm' => '68.00',
            'bedroom_count' => 2,
            'bathroom_count' => 1,
            'operational_status' => 'ACTIVE',
            'floor_number' => 1,
            'block_id' => 'blk-001',
            'block_name' => 'Khối A (Tháp Ruby)',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
        ],
        [
            'id' => 'apt-003',
            'floor_id' => 'flr-a02',
            'code' => 'A-201',
            'area_sqm' => '85.00',
            'bedroom_count' => 3,
            'bathroom_count' => 2,
            'operational_status' => 'ACTIVE',
            'floor_number' => 2,
            'block_id' => 'blk-001',
            'block_name' => 'Khối A (Tháp Ruby)',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
        ],
        [
            'id' => 'apt-004',
            'floor_id' => 'flr-b01',
            'code' => 'B-101',
            'area_sqm' => '70.00',
            'bedroom_count' => 2,
            'bathroom_count' => 1,
            'operational_status' => 'ACTIVE',
            'floor_number' => 1,
            'block_id' => 'blk-002',
            'block_name' => 'Khối B (Tháp Sapphire)',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
        ],
    ],

    // =========================================================================
    // 4. TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN (DEMO ACCOUNTS)
    // =========================================================================
    'users' => [
        'manager@smartcondo.vn' => [
            'id' => 'usr-manager',
            'email' => 'manager@smartcondo.vn',
            'password' => 'Manager@123',
            'fullName' => 'Trần Văn Quản Lý (Giám đốc BQL)',
            'scopes' => [
                ['role' => 'BUILDING_MANAGER', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
            ],
            'permissions' => [
                'dashboard:read', 'building:read', 'building:manage', 'apartment:read',
                'apartment:manage', 'people:read', 'people:manage', 'utility:read',
                'utility:manage', 'billing:read', 'billing:manage', 'payment:record',
                'maintenance:read', 'maintenance:manage', 'notification:read', 'notification:manage'
            ],
        ],

        'accountant@smartcondo.vn' => [
            'id' => 'usr-accountant',
            'email' => 'accountant@smartcondo.vn',
            'password' => 'Accountant@123',
            'fullName' => 'Lê Thị Thu Cúc (Kế toán)',
            'scopes' => [
                ['role' => 'ACCOUNTANT', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
            ],
            'permissions' => [
                'dashboard:read', 'apartment:read', 'people:read', 'utility:read',
                'billing:read', 'billing:manage', 'payment:record', 'notification:read'
            ],
        ],

        'tech@smartcondo.vn' => [
            'id' => 'usr-tech',
            'email' => 'tech@smartcondo.vn',
            'password' => 'Tech@123',
            'fullName' => 'Đỗ Hoàng Bách (Kỹ thuật viên)',
            'scopes' => [
                ['role' => 'TECHNICIAN', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
            ],
            'permissions' => [
                'apartment:read', 'utility:read', 'utility:manage',
                'maintenance:read', 'maintenance:manage', 'notification:read'
            ],
        ],

        'resident@smartcondo.vn' => [
            'id' => 'usr-resident',
            'email' => 'resident@smartcondo.vn',
            'password' => 'Resident@123',
            'fullName' => 'Nguyễn Văn An (Cư dân A-101)',
            'apartment_id' => 'apt-001',
            'scopes' => [
                ['role' => 'OWNER', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
                ['role' => 'RESIDENT', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
            ],
            'permissions' => [
                'apartment:read', 'utility:read', 'billing:read', 'payment:record',
                'maintenance:read', 'maintenance:manage', 'notification:read'
            ],
        ],

        'tenant@smartcondo.vn' => [
            'id' => 'usr-tenant',
            'email' => 'tenant@smartcondo.vn',
            'password' => 'Resident@123',
            'fullName' => 'Lê Hoàng Nam (Khách thuê A-102)',
            'apartment_id' => 'apt-002',
            'scopes' => [
                ['role' => 'RESIDENT', 'organization_id' => 'org-001', 'building_id' => 'bld-001'],
            ],
            'permissions' => [
                'apartment:read', 'utility:read', 'billing:read', 'payment:record',
                'maintenance:read', 'maintenance:manage', 'notification:read'
            ],
        ],

        'admin@smartcondo.vn' => [
            'id' => 'usr-admin',
            'email' => 'admin@smartcondo.vn',
            'password' => 'Admin@123456',
            'fullName' => 'Quản trị viên Hệ thống (System Admin)',
            'scopes' => [
                ['role' => 'SUPER_ADMIN', 'organization_id' => null, 'building_id' => null],
            ],
            'permissions' => [
                'dashboard:read', 'building:read', 'building:manage', 'apartment:read',
                'apartment:manage', 'people:read', 'people:manage', 'utility:read',
                'utility:manage', 'billing:read', 'billing:manage', 'payment:record',
                'maintenance:read', 'maintenance:manage', 'notification:read', 'notification:manage'
            ],
        ],
    ],

    // =========================================================================
    // 5. CHỦ SỞ HỮU & CƯ DÂN (PEOPLE & RESIDENCIES)
    // =========================================================================
    'owners' => [
        'apt-001' => [
            [
                'id' => 'own-001',
                'person_id' => 'per-001',
                'full_name' => 'Nguyễn Văn An',
                'email' => 'resident@smartcondo.vn',
                'phone' => '0903123456',
                'ownership_percent' => '100',
                'valid_from' => '2024-01-01',
                'valid_to' => null,
            ],
        ],
        'apt-002' => [
            [
                'id' => 'own-002',
                'person_id' => 'per-002',
                'full_name' => 'Võ Minh Trí',
                'email' => 'tri.vo@example.com',
                'phone' => '0918765432',
                'ownership_percent' => '100',
                'valid_from' => '2024-03-15',
                'valid_to' => null,
            ],
        ],
        'apt-003' => [
            [
                'id' => 'own-003',
                'person_id' => 'per-003',
                'full_name' => 'Phạm Quang Huy',
                'email' => 'huy.pham@example.com',
                'phone' => '0987654321',
                'ownership_percent' => '100',
                'valid_from' => '2024-02-01',
                'valid_to' => null,
            ],
        ],
    ],

    'residents' => [
        'apt-001' => [
            [
                'id' => 'res-001',
                'person_id' => 'per-001',
                'full_name' => 'Nguyễn Văn An',
                'email' => 'resident@smartcondo.vn',
                'phone' => '0903123456',
                'relationship' => 'OWNER',
                'can_view_bills' => true,
                'can_pay_bills' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
            ],
            [
                'id' => 'res-002',
                'person_id' => 'per-004',
                'full_name' => 'Trần Thị Mai',
                'email' => 'mai.tran@example.com',
                'phone' => '0909888777',
                'relationship' => 'FAMILY',
                'can_view_bills' => true,
                'can_pay_bills' => true,
                'valid_from' => '2024-01-01',
                'valid_to' => null,
            ],
        ],
        'apt-002' => [
            [
                'id' => 'res-003',
                'person_id' => 'per-005',
                'full_name' => 'Lê Hoàng Nam',
                'email' => 'tenant@smartcondo.vn',
                'phone' => '0933444555',
                'relationship' => 'TENANT',
                'can_view_bills' => true,
                'can_pay_bills' => true,
                'valid_from' => '2024-06-01',
                'valid_to' => null,
            ],
        ],
    ],

    // =========================================================================
    // 6. BIỂU PHÍ DỊCH VỤ (FEE TYPES)
    // =========================================================================
    'feeTypes' => [
        [
            'id' => 'fee-001',
            'building_id' => 'bld-001',
            'code' => 'QL-SQM',
            'name' => 'Phí quản lý vận hành tòa nhà',
            'calculation_method' => 'PER_SQM',
            'unit_price' => '8000',
            'active' => true,
        ],
        [
            'id' => 'fee-002',
            'building_id' => 'bld-001',
            'code' => 'DIEN-SH',
            'name' => 'Tiền điện sinh hoạt',
            'calculation_method' => 'ELECTRICITY',
            'unit_price' => '3200',
            'active' => true,
        ],
        [
            'id' => 'fee-003',
            'building_id' => 'bld-001',
            'code' => 'NUOC-SH',
            'name' => 'Tiền nước sinh hoạt',
            'calculation_method' => 'WATER',
            'unit_price' => '14500',
            'active' => true,
        ],
        [
            'id' => 'fee-004',
            'building_id' => 'bld-001',
            'code' => 'XE-MAY',
            'name' => 'Phí trông giữ xe máy',
            'calculation_method' => 'FIXED',
            'unit_price' => '120000',
            'active' => true,
        ],
    ],

    // =========================================================================
    // 7. CHỈ SỐ TIỆN ÍCH (UTILITY READINGS)
    // =========================================================================
    'readings' => [
        [
            'id' => 'utl-001',
            'apartment_id' => 'apt-001',
            'apartment_code' => 'A-101',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'electric_previous' => '1250',
            'electric_current' => '1480',
            'water_previous' => '140',
            'water_current' => '158',
            'recorded_by' => 'usr-tech',
            'note' => 'Đồng hồ hoạt động bình thường',
            'created_at' => '2026-10-31T09:00:00Z',
        ],
        [
            'id' => 'utl-002',
            'apartment_id' => 'apt-002',
            'apartment_code' => 'A-102',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'electric_previous' => '820',
            'electric_current' => '995',
            'water_previous' => '95',
            'water_current' => '107',
            'recorded_by' => 'usr-tech',
            'note' => 'Chỉ số chốt ngày cuối tháng',
            'created_at' => '2026-10-31T09:30:00Z',
        ],
        [
            'id' => 'utl-003',
            'apartment_id' => 'apt-003',
            'apartment_code' => 'A-201',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'electric_previous' => '2100',
            'electric_current' => '2380',
            'water_previous' => '210',
            'water_current' => '232',
            'recorded_by' => 'usr-tech',
            'note' => null,
            'created_at' => '2026-10-31T10:00:00Z',
        ],
    ],

    // =========================================================================
    // 8. KỲ THU PHÍ (BILLING PERIODS)
    // =========================================================================
    'billingPeriods' => [
        [
            'id' => 'bp-2026-10',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'due_date' => '2026-11-15',
            'status' => 'ISSUED',
            'invoice_count' => 2,
            'total_amount' => '3123000',
            'created_at' => '2026-10-31T14:00:00Z',
        ],
        [
            'id' => 'bp-2026-11',
            'building_id' => 'bld-001',
            'building_name' => 'Tòa nhà Sky Tower',
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
            'due_date' => '2026-12-15',
            'status' => 'DRAFT',
            'invoice_count' => 0,
            'total_amount' => '0',
            'created_at' => '2026-11-01T08:00:00Z',
        ],
    ],

    // =========================================================================
    // 9. HÓA ĐƠN & BẢNG KÊ CHI TIẾT (INVOICES & LINE ITEMS)
    // =========================================================================
    'invoices' => [
        [
            'id' => 'inv-001',
            'billing_period_id' => 'bp-2026-10',
            'apartment_id' => 'apt-001',
            'apartment_code' => 'A-101',
            'invoice_number' => 'INV-202610-A101',
            'status' => 'ISSUED',
            'due_date' => '2026-11-15',
            'total_amount' => '1725000',
            'paid_amount' => '0',
            'balance_due' => '1725000',
            'created_at' => '2026-10-31T14:30:00Z',
            'items' => [
                [
                    'id' => 'itm-001',
                    'fee_code' => 'QL-SQM',
                    'fee_name' => 'Phí quản lý vận hành (75.5 m²)',
                    'description' => 'Phí quản lý diện tích 75.5 m²',
                    'quantity' => '75.50',
                    'unit_price' => '8000',
                    'amount' => '604000',
                ],
                [
                    'id' => 'itm-002',
                    'fee_code' => 'DIEN-SH',
                    'fee_name' => 'Tiền điện sinh hoạt (230 kWh)',
                    'description' => 'Điện tiêu thụ: 1.250 kWh → 1.480 kWh',
                    'quantity' => '230',
                    'unit_price' => '3200',
                    'amount' => '736000',
                ],
                [
                    'id' => 'itm-003',
                    'fee_code' => 'NUOC-SH',
                    'fee_name' => 'Tiền nước sinh hoạt (18 m³)',
                    'description' => 'Nước tiêu thụ: 140 m³ → 158 m³',
                    'quantity' => '18',
                    'unit_price' => '14500',
                    'amount' => '261000',
                ],
                [
                    'id' => 'itm-004',
                    'fee_code' => 'XE-MAY',
                    'fee_name' => 'Phí trông giữ xe máy (1 xe)',
                    'description' => 'Phí giữ xe máy đăng ký tháng 10',
                    'quantity' => '1',
                    'unit_price' => '120000',
                    'amount' => '120000',
                ],
            ],
            'payments' => [],
        ],
        [
            'id' => 'inv-002',
            'billing_period_id' => 'bp-2026-10',
            'apartment_id' => 'apt-002',
            'apartment_code' => 'A-102',
            'invoice_number' => 'INV-202610-A102',
            'status' => 'PAID',
            'due_date' => '2026-11-15',
            'total_amount' => '1398000',
            'paid_amount' => '1398000',
            'balance_due' => '0',
            'created_at' => '2026-10-31T14:30:00Z',
            'items' => [
                [
                    'id' => 'itm-005',
                    'fee_code' => 'QL-SQM',
                    'fee_name' => 'Phí quản lý vận hành (68.0 m²)',
                    'description' => 'Phí quản lý diện tích 68.0 m²',
                    'quantity' => '68.00',
                    'unit_price' => '8000',
                    'amount' => '544000',
                ],
                [
                    'id' => 'itm-006',
                    'fee_code' => 'DIEN-SH',
                    'fee_name' => 'Tiền điện sinh hoạt (175 kWh)',
                    'description' => 'Điện tiêu thụ: 820 kWh → 995 kWh',
                    'quantity' => '175',
                    'unit_price' => '3200',
                    'amount' => '560000',
                ],
                [
                    'id' => 'itm-007',
                    'fee_code' => 'NUOC-SH',
                    'fee_name' => 'Tiền nước sinh hoạt (12 m³)',
                    'description' => 'Nước tiêu thụ: 95 m³ → 107 m³',
                    'quantity' => '12',
                    'unit_price' => '14500',
                    'amount' => '174000',
                ],
                [
                    'id' => 'itm-008',
                    'fee_code' => 'XE-MAY',
                    'fee_name' => 'Phí trông giữ xe máy (1 xe)',
                    'description' => 'Phí giữ xe máy đăng ký tháng 10',
                    'quantity' => '1',
                    'unit_price' => '120000',
                    'amount' => '120000',
                ],
            ],
            'payments' => [
                [
                    'id' => 'pay-001',
                    'amount' => '1398000',
                    'method' => 'BANK_TRANSFER',
                    'status' => 'RECORDED',
                    'paid_at' => '2026-11-02T10:15:00Z',
                    'idempotency_key' => 'tx-vcb-20261102-9988',
                ],
            ],
        ],
    ],

    // =========================================================================
    // 10. YÊU CẦU BẢO TRÌ SỬA CHỮA (MAINTENANCE REQUESTS)
    // =========================================================================
    'maintenanceRequests' => [
        [
            'id' => 'req-001',
            'apartment_id' => 'apt-001',
            'apartment_code' => 'A-101',
            'title' => 'Đèn ban công chập chờn',
            'description' => 'Bóng đèn LED ngoài ban công hay bị nhấp nháy vào buổi tối, nhờ kỹ thuật kiểm tra đuôi đèn.',
            'priority' => 'MEDIUM',
            'status' => 'IN_PROGRESS',
            'created_at' => '2026-11-04T19:30:00Z',
            'updated_at' => '2026-11-05T08:00:00Z',
        ],
        [
            'id' => 'req-002',
            'apartment_id' => 'apt-002',
            'apartment_code' => 'A-102',
            'title' => 'Áp lực nước vòi sen tắm hơi yếu',
            'description' => 'Vòi sen trong phòng tắm chính chảy nước yếu hơn bình thường.',
            'priority' => 'LOW',
            'status' => 'PENDING',
            'created_at' => '2026-11-05T07:15:00Z',
            'updated_at' => '2026-11-05T07:15:00Z',
        ],
        [
            'id' => 'req-003',
            'apartment_id' => 'apt-004',
            'apartment_code' => 'B-101',
            'title' => 'Khóa cửa từ kêu tít tít báo pin yếu',
            'description' => 'Khóa cửa căn hộ báo âm thanh pin yếu, đã hỗ trợ thay 4 viên pin AA.',
            'priority' => 'HIGH',
            'status' => 'COMPLETED',
            'created_at' => '2026-11-03T14:00:00Z',
            'updated_at' => '2026-11-03T16:20:00Z',
        ],
    ],

    // =========================================================================
    // 11. BẢNG TIN & THÔNG BÁO (NOTICES / NOTIFICATIONS)
    // =========================================================================
    'notifications' => [
        [
            'id' => 'not-001',
            'building_id' => 'bld-001',
            'title' => 'Lịch bảo trì hệ thống thang máy Tháp A ngày 10/11/2026',
            'content' => 'Ban quản lý xin thông báo kế hoạch kiểm tra định kỳ thang máy Tháp A từ 09:00 đến 11:30 sáng. Trong thời gian này quý cư dân vui lòng sử dụng thang hàng hoặc thang bộ.',
            'publish_at' => '2026-11-05T08:00:00Z',
            'read_at' => null,
            'created_at' => '2026-11-05T08:00:00Z',
        ],
        [
            'id' => 'not-002',
            'building_id' => 'bld-001',
            'title' => 'Thông báo phát hành hóa đơn dịch vụ & tiện ích kỳ tháng 10/2026',
            'content' => 'Kính gửi Quý Cư dân, hóa đơn dịch vụ quản lý và điện nước tháng 10/2026 đã được phát hành trên ứng dụng SmartCondo. Hạn thanh toán đến hết ngày 15/11/2026.',
            'publish_at' => '2026-11-01T07:30:00Z',
            'read_at' => '2026-11-01T09:00:00Z',
            'created_at' => '2026-11-01T07:30:00Z',
        ],
        [
            'id' => 'not-003',
            'building_id' => 'bld-001',
            'title' => 'Phun thuốc diệt côn trùng định kỳ khu vực hành lang & tầng hầm',
            'content' => 'BQL sẽ tiến hành phun thuốc diệt côn trùng vào lúc 22:00 ngày Thứ Bảy tuần này. Kính mong quý cư dân lưu ý đóng kín cửa sổ căn hộ.',
            'publish_at' => '2026-10-28T10:00:00Z',
            'read_at' => '2026-10-28T14:20:00Z',
            'created_at' => '2026-10-28T10:00:00Z',
        ],
    ],
];
