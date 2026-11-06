<?php
/**
 * SmartCondo - Mockup Backend Server (PHP)
 * 
 * Máy chủ mô phỏng nhẹ chạy độc lập bằng PHP CLI built-in server:
 *   php -S 127.0.0.1:3000 mock/server.php
 * 
 * Không yêu cầu Docker, PostgreSQL hay bất kỳ thư viện ngoài nào.
 * Trùng khớp 100% endpoint, URL format và cấu trúc phản hồi với bản Express Production.
 */

// 1. Phục vụ file tĩnh nếu có yêu cầu trực tiếp
$rawUri = $_SERVER['REQUEST_URI'] ?? $_ENV['REQUEST_URI'] ?? '/';
$uri = parse_url($rawUri, PHP_URL_PATH);
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// 2. Thiết lập Headers CORS hoàn chỉnh cho Frontend (Vite)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Xử lý Preflight CORS Request (OPTIONS)
$method = $_SERVER['REQUEST_METHOD'] ?? $_ENV['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 3. Cơ chế Lưu trữ Trạng thái (Runtime State Store)
$storeFile = __DIR__ . '/store.json';

function getInitialData(): array {
    $dataFile = __DIR__ . '/data.php';
    if (!file_exists($dataFile)) {
        throw new Exception("Missing mock data file: $dataFile");
    }
    return require $dataFile;
}

function loadStore(): array {
    global $storeFile;
    if (!file_exists($storeFile)) {
        $initial = getInitialData();
        saveStore($initial);
        return $initial;
    }
    $raw = file_get_contents($storeFile);
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : getInitialData();
}

function saveStore(array $data): void {
    global $storeFile;
    file_put_contents($storeFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$store = loadStore();

// 4. Các hàm Trợ giúp (Helper Functions)
function jsonSuccess(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $code, string $message, int $statusCode = 400): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => ['code' => $code, 'message' => $message],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonBody(): array {
    $input = file_get_contents('php://input');
    if (!$input) {
        $input = file_get_contents('php://stdin');
    }
    if (!$input) return [];
    $decoded = json_decode($input, true);
    return is_array($decoded) ? $decoded : [];
}

function getCurrentUser(array $store): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_ENV['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    $token = trim($matches[1]);
    foreach ($store['users'] as $user) {
        if ('mock-jwt-token-' . $user['id'] === $token || 'mock-token-' . $user['id'] === $token) {
            return $user;
        }
    }
    // Nếu token có chứa email
    foreach ($store['users'] as $email => $user) {
        if (str_contains($token, $user['id'])) {
            return $user;
        }
    }
    return null;
}

// 5. Chuẩn hóa Endpoint Path
$method = $_SERVER['REQUEST_METHOD'] ?? $_ENV['REQUEST_METHOD'] ?? 'GET';
$rawPath = $_SERVER['REQUEST_URI'] ?? $_ENV['REQUEST_URI'] ?? '/';
$path = parse_url($rawPath, PHP_URL_PATH);

// Bỏ tiền tố /api/v1 hoặc /api nếu có để so khớp linh hoạt
$normPath = preg_replace('#^/api(/v1)?#', '', $path);
if ($normPath === '') $normPath = '/';

// =============================================================================
// 6. ĐIỀU HƯỚNG ROUTER (EXACT MATCHING ENDPOINTS)
// =============================================================================

// --- 6.1. Healthcheck ---
if ($normPath === '/health') {
    jsonSuccess([
        'status' => 'healthy',
        'database' => 'connected (php-mockup)',
        'timestamp' => date('c'),
        'environment' => 'php-mock',
    ]);
}

// --- 6.2. 1-Click Demo Seed / Reset ---
if ($normPath === '/demo/seed' && $method === 'POST') {
    $store = getInitialData();
    saveStore($store);
    jsonSuccess([
        'message' => 'Toàn bộ dữ liệu mẫu đã được nạp lại thành công.',
        'timestamp' => date('c'),
    ]);
}

// --- 6.3. Xác thực (Auth) ---
if ($normPath === '/auth/login' && $method === 'POST') {
    $body = getJsonBody();
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string)($body['password'] ?? '');

    $matched = null;
    foreach ($store['users'] as $userEmail => $userData) {
        if (strtolower($userEmail) === $email) {
            $matched = $userData;
            break;
        }
    }

    if (!$matched || $matched['password'] !== $password) {
        jsonError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.', 401);
    }

    $token = 'mock-jwt-token-' . $matched['id'];
    jsonSuccess([
        'user' => [
            'id' => $matched['id'],
            'email' => $matched['email'],
            'fullName' => $matched['fullName'],
        ],
        'scopes' => $matched['scopes'],
        'permissions' => $matched['permissions'],
        'accessToken' => $token,
        'refreshToken' => 'mock-refresh-token-' . $matched['id'],
    ]);
}

if ($normPath === '/auth/refresh' && $method === 'POST') {
    $body = getJsonBody();
    $refreshToken = $body['refreshToken'] ?? '';
    jsonSuccess([
        'accessToken' => 'mock-jwt-token-refreshed',
        'refreshToken' => $refreshToken ?: 'mock-refresh-token-new',
    ]);
}

if ($normPath === '/auth/logout' && $method === 'POST') {
    jsonSuccess(null);
}

// --- 6.4. Dashboard Summary ---
if ($normPath === '/dashboard/summary' && $method === 'GET') {
    $currentUser = getCurrentUser($store);
    if ($currentUser && !in_array('dashboard:read', $currentUser['permissions'] ?? [])) {
        jsonError('FORBIDDEN', 'Bạn không có quyền xem trang tổng quan.', 403);
    }

    $totalApartments = count($store['apartments']);
    $billedTotal = 0;
    $outstandingTotal = 0;
    foreach ($store['invoices'] as $inv) {
        $billedTotal += (float)$inv['total_amount'];
        $outstandingTotal += (float)$inv['balance_due'];
    }

    $openMaintenance = 0;
    $completedMaintenance = 0;
    foreach ($store['maintenanceRequests'] as $req) {
        if ($req['status'] === 'COMPLETED') $completedMaintenance++;
        else $openMaintenance++;
    }

    $elecUsage = 0;
    $waterUsage = 0;
    foreach ($store['readings'] as $rd) {
        $elecUsage += max(0, (float)$rd['electric_current'] - (float)$rd['electric_previous']);
        $waterUsage += max(0, (float)$rd['water_current'] - (float)$rd['water_previous']);
    }

    jsonSuccess([
        'buildingIds' => array_column($store['buildings'], 'id'),
        'apartments' => [
            'total' => $totalApartments,
            'occupied' => $totalApartments,
        ],
        'invoices' => [
            'billed' => (string)$billedTotal,
            'outstanding' => (string)$outstandingTotal,
        ],
        'maintenance' => [
            'open' => $openMaintenance,
            'completed_this_month' => $completedMaintenance,
        ],
        'utilities' => [
            'electricity_usage' => (string)$elecUsage,
            'water_usage' => (string)$waterUsage,
        ],
    ]);
}

// --- 6.5. Tòa nhà (Buildings) ---
if ($normPath === '/buildings' && $method === 'GET') {
    jsonSuccess(['buildings' => $store['buildings']]);
}

if ($normPath === '/buildings' && $method === 'POST') {
    $body = getJsonBody();
    $newBuilding = [
        'id' => 'bld-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'organization_id' => 'org-001',
        'code' => trim($body['code'] ?? 'BLD-' . rand(100, 999)),
        'name' => trim($body['name'] ?? 'Tòa nhà mới'),
        'address' => trim($body['address'] ?? ''),
        'status' => 'ACTIVE',
        'created_at' => date('c'),
    ];
    $store['buildings'][] = $newBuilding;
    saveStore($store);
    jsonSuccess(['building' => $newBuilding], 201);
}

// Blocks của tòa nhà
if (preg_match('#^/buildings/([^/]+)/blocks$#', $normPath, $m) && $method === 'GET') {
    $bldId = $m[1];
    $filtered = array_values(array_filter($store['blocks'], fn($b) => $b['building_id'] === $bldId));
    jsonSuccess(['blocks' => $filtered]);
}

if (preg_match('#^/buildings/([^/]+)/blocks$#', $normPath, $m) && $method === 'POST') {
    $bldId = $m[1];
    $body = getJsonBody();
    $newBlock = [
        'id' => 'blk-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'building_id' => $bldId,
        'code' => trim($body['code'] ?? 'X'),
        'name' => trim($body['name'] ?? 'Khối mới'),
        'floors' => [],
    ];
    $store['blocks'][] = $newBlock;
    saveStore($store);
    jsonSuccess(['block' => $newBlock], 201);
}

if (preg_match('#^/blocks/([^/]+)/floors$#', $normPath, $m) && $method === 'POST') {
    $blockId = $m[1];
    $body = getJsonBody();
    $newFloor = [
        'id' => 'flr-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'floorNumber' => (int)($body['floorNumber'] ?? 1),
        'name' => $body['name'] ?? ('Tầng ' . (int)($body['floorNumber'] ?? 1)),
    ];
    foreach ($store['blocks'] as &$blk) {
        if ($blk['id'] === $blockId) {
            $blk['floors'][] = $newFloor;
            break;
        }
    }
    saveStore($store);
    jsonSuccess(['floor' => $newFloor], 201);
}

// --- 6.6. Căn hộ (Apartments) ---
if ($normPath === '/apartments' && $method === 'GET') {
    $currentUser = getCurrentUser($store);
    $res = $store['apartments'];
    // Nếu là cư dân, chỉ trả căn hộ của cư dân đó
    if ($currentUser && !empty($currentUser['apartment_id'])) {
        $res = array_values(array_filter($res, fn($a) => $a['id'] === $currentUser['apartment_id']));
    }
    jsonSuccess(['apartments' => $res]);
}

if ($normPath === '/apartments' && $method === 'POST') {
    $body = getJsonBody();
    $floorId = $body['floorId'] ?? 'flr-a01';
    
    // Tìm block và floor thông tin
    $blockName = 'Khối A (Tháp Ruby)';
    $blockId = 'blk-001';
    $floorNum = 1;
    foreach ($store['blocks'] as $blk) {
        foreach ($blk['floors'] as $fl) {
            if ($fl['id'] === $floorId) {
                $blockId = $blk['id'];
                $blockName = $blk['name'];
                $floorNum = $fl['floorNumber'];
                break 2;
            }
        }
    }

    $newApartment = [
        'id' => 'apt-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'floor_id' => $floorId,
        'code' => trim($body['code'] ?? 'A-999'),
        'area_sqm' => (string)($body['areaSqm'] ?? '70.00'),
        'bedroom_count' => (int)($body['bedroomCount'] ?? 2),
        'bathroom_count' => (int)($body['bathroomCount'] ?? 1),
        'operational_status' => 'ACTIVE',
        'floor_number' => $floorNum,
        'block_id' => $blockId,
        'block_name' => $blockName,
        'building_id' => 'bld-001',
        'building_name' => 'Tòa nhà Sky Tower',
    ];
    $store['apartments'][] = $newApartment;
    saveStore($store);
    jsonSuccess(['apartment' => $newApartment], 201);
}

// --- 6.7. Chủ sở hữu & Cư dân (People & Residencies) ---
if (preg_match('#^/apartments/([^/]+)/owners$#', $normPath, $m) && $method === 'GET') {
    $aptId = $m[1];
    $owners = $store['owners'][$aptId] ?? [];
    jsonSuccess(['owners' => $owners]);
}

if (preg_match('#^/apartments/([^/]+)/owners$#', $normPath, $m) && $method === 'POST') {
    $aptId = $m[1];
    $body = getJsonBody();
    $newOwner = [
        'id' => 'own-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'person_id' => 'per-' . substr(bin2hex(random_bytes(3)), 0, 6),
        'full_name' => trim($body['fullName'] ?? 'Chủ hộ mới'),
        'email' => $body['email'] ?? null,
        'phone' => $body['phone'] ?? null,
        'ownership_percent' => (string)($body['ownershipPercent'] ?? 100),
        'valid_from' => $body['validFrom'] ?? date('Y-m-d'),
        'valid_to' => null,
    ];
    $store['owners'][$aptId][] = $newOwner;
    saveStore($store);
    jsonSuccess(['ownership' => $newOwner], 201);
}

if (preg_match('#^/apartments/([^/]+)/owners/([^/]+)/end$#', $normPath, $m) && $method === 'POST') {
    $aptId = $m[1];
    $ownerId = $m[2];
    $updated = null;
    if (isset($store['owners'][$aptId])) {
        foreach ($store['owners'][$aptId] as &$own) {
            if ($own['id'] === $ownerId) {
                $own['valid_to'] = date('Y-m-d');
                $updated = $own;
                break;
            }
        }
    }
    saveStore($store);
    jsonSuccess(['ownership' => $updated]);
}

if (preg_match('#^/apartments/([^/]+)/residents$#', $normPath, $m) && $method === 'GET') {
    $aptId = $m[1];
    $residents = $store['residents'][$aptId] ?? [];
    jsonSuccess(['residents' => $residents]);
}

if (preg_match('#^/apartments/([^/]+)/residents$#', $normPath, $m) && $method === 'POST') {
    $aptId = $m[1];
    $body = getJsonBody();
    $newResident = [
        'id' => 'res-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'person_id' => 'per-' . substr(bin2hex(random_bytes(3)), 0, 6),
        'full_name' => trim($body['fullName'] ?? 'Cư dân mới'),
        'email' => $body['email'] ?? null,
        'phone' => $body['phone'] ?? null,
        'relationship' => $body['relationship'] ?? 'TENANT',
        'can_view_bills' => !empty($body['canViewBills']),
        'can_pay_bills' => !empty($body['canPayBills']),
        'valid_from' => $body['validFrom'] ?? date('Y-m-d'),
        'valid_to' => null,
    ];
    $store['residents'][$aptId][] = $newResident;
    saveStore($store);
    jsonSuccess(['residency' => $newResident], 201);
}

if (preg_match('#^/apartments/([^/]+)/residents/([^/]+)/end$#', $normPath, $m) && $method === 'POST') {
    $aptId = $m[1];
    $resId = $m[2];
    $updated = null;
    if (isset($store['residents'][$aptId])) {
        foreach ($store['residents'][$aptId] as &$res) {
            if ($res['id'] === $resId) {
                $res['valid_to'] = date('Y-m-d');
                $updated = $res;
                break;
            }
        }
    }
    saveStore($store);
    jsonSuccess(['residency' => $updated]);
}

// --- 6.8. Biểu phí dịch vụ (Fee Types) ---
if ($normPath === '/fee-types' && $method === 'GET') {
    jsonSuccess(['feeTypes' => $store['feeTypes']]);
}

if ($normPath === '/fee-types' && $method === 'POST') {
    $body = getJsonBody();
    $newFee = [
        'id' => 'fee-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'building_id' => $body['buildingId'] ?? 'bld-001',
        'code' => strtoupper(trim($body['code'] ?? 'FEE-NEW')),
        'name' => trim($body['name'] ?? 'Phí mới'),
        'calculation_method' => $body['calculationMethod'] ?? 'FIXED',
        'unit_price' => (string)($body['unitPrice'] ?? '0'),
        'active' => true,
    ];
    $store['feeTypes'][] = $newFee;
    saveStore($store);
    jsonSuccess(['feeType' => $newFee], 201);
}

// --- 6.9. Chỉ số tiện ích (Utility Readings) ---
if ($normPath === '/utility-readings' && $method === 'GET') {
    $currentUser = getCurrentUser($store);
    $readings = $store['readings'];
    if ($currentUser && !empty($currentUser['apartment_id'])) {
        $readings = array_values(array_filter($readings, fn($r) => $r['apartment_id'] === $currentUser['apartment_id']));
    }
    jsonSuccess(['readings' => $readings]);
}

if ($normPath === '/utility-readings' && $method === 'POST') {
    $body = getJsonBody();
    $aptId = $body['apartmentId'] ?? 'apt-001';
    
    // Tìm mã căn hộ
    $aptCode = 'A-101';
    foreach ($store['apartments'] as $apt) {
        if ($apt['id'] === $aptId) {
            $aptCode = $apt['code'];
            break;
        }
    }

    $currentUser = getCurrentUser($store);
    $newReading = [
        'id' => 'utl-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'apartment_id' => $aptId,
        'apartment_code' => $aptCode,
        'period_start' => $body['periodStart'] ?? date('Y-m-01'),
        'period_end' => $body['periodEnd'] ?? date('Y-m-d'),
        'electric_previous' => (string)($body['electricPrevious'] ?? 0),
        'electric_current' => (string)($body['electricCurrent'] ?? 0),
        'water_previous' => (string)($body['waterPrevious'] ?? 0),
        'water_current' => (string)($body['waterCurrent'] ?? 0),
        'recorded_by' => $currentUser['id'] ?? 'usr-tech',
        'note' => $body['note'] ?? null,
        'created_at' => date('c'),
    ];
    // Chèn lên đầu danh sách để dễ nhìn
    array_unshift($store['readings'], $newReading);
    saveStore($store);
    jsonSuccess(['reading' => $newReading], 201);
}

// --- 6.10. Kỳ thu phí (Billing Periods) ---
if ($normPath === '/billing-periods' && $method === 'GET') {
    jsonSuccess(['billingPeriods' => $store['billingPeriods']]);
}

if ($normPath === '/billing-periods' && $method === 'POST') {
    $body = getJsonBody();
    $newPeriod = [
        'id' => 'bp-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'building_id' => $body['buildingId'] ?? 'bld-001',
        'building_name' => 'Tòa nhà Sky Tower',
        'period_start' => $body['periodStart'] ?? date('Y-m-01'),
        'period_end' => $body['periodEnd'] ?? date('Y-m-t'),
        'due_date' => $body['dueDate'] ?? date('Y-m-d', strtotime('+15 days')),
        'status' => 'DRAFT',
        'invoice_count' => 0,
        'total_amount' => '0',
        'created_at' => date('c'),
    ];
    array_unshift($store['billingPeriods'], $newPeriod);
    saveStore($store);
    jsonSuccess(['billingPeriod' => $newPeriod], 201);
}

// Sinh hóa đơn tự động cho kỳ thu (Generate Invoices)
if (preg_match('#^/billing-periods/([^/]+)/generate$#', $normPath, $m) && $method === 'POST') {
    $periodId = $m[1];
    
    // Tìm kỳ thu
    $targetPeriodIndex = null;
    foreach ($store['billingPeriods'] as $idx => $bp) {
        if ($bp['id'] === $periodId) {
            $targetPeriodIndex = $idx;
            break;
        }
    }

    if ($targetPeriodIndex === null) {
        jsonError('NOT_FOUND', 'Kỳ thu phí không tồn tại.', 404);
    }

    $period = &$store['billingPeriods'][$targetPeriodIndex];
    $generatedCount = 0;
    $grandTotal = 0;

    // Quét từng căn hộ đang hoạt động
    foreach ($store['apartments'] as $apt) {
        if ($apt['operational_status'] !== 'ACTIVE') continue;

        // Tìm chỉ số tiện ích tương ứng của căn hộ
        $reading = null;
        foreach ($store['readings'] as $rd) {
            if ($rd['apartment_id'] === $apt['id']) {
                $reading = $rd;
                break;
            }
        }

        $items = [];
        $invoiceTotal = 0;

        foreach ($store['feeTypes'] as $fee) {
            if (!$fee['active']) continue;

            $qty = 1;
            $desc = $fee['name'];

            if ($fee['calculation_method'] === 'PER_SQM') {
                $qty = (float)($apt['area_sqm'] ?? 0);
                $desc = "Phí quản lý diện tích {$qty} m²";
            } elseif ($fee['calculation_method'] === 'ELECTRICITY') {
                $qty = $reading ? max(0, (float)$reading['electric_current'] - (float)$reading['electric_previous']) : 150;
                $desc = "Điện tiêu thụ: {$qty} kWh";
            } elseif ($fee['calculation_method'] === 'WATER') {
                $qty = $reading ? max(0, (float)$reading['water_current'] - (float)$reading['water_previous']) : 15;
                $desc = "Nước tiêu thụ: {$qty} m³";
            } elseif ($fee['calculation_method'] === 'FIXED') {
                $qty = 1;
            }

            $amount = round($qty * (float)$fee['unit_price']);
            $invoiceTotal += $amount;

            $items[] = [
                'id' => 'itm-' . substr(bin2hex(random_bytes(4)), 0, 8),
                'fee_code' => $fee['code'],
                'fee_name' => $fee['name'],
                'description' => $desc,
                'quantity' => (string)$qty,
                'unit_price' => (string)$fee['unit_price'],
                'amount' => (string)$amount,
            ];
        }

        // Tạo hoặc cập nhật hóa đơn
        $invNumber = 'INV-' . str_replace('-', '', substr($period['period_start'], 0, 7)) . '-' . str_replace('-', '', $apt['code']);
        $newInvoice = [
            'id' => 'inv-' . substr(bin2hex(random_bytes(4)), 0, 8),
            'billing_period_id' => $period['id'],
            'apartment_id' => $apt['id'],
            'apartment_code' => $apt['code'],
            'invoice_number' => $invNumber,
            'status' => 'DRAFT',
            'due_date' => $period['due_date'],
            'total_amount' => (string)$invoiceTotal,
            'paid_amount' => '0',
            'balance_due' => (string)$invoiceTotal,
            'created_at' => date('c'),
            'items' => $items,
            'payments' => [],
        ];

        // Xóa hóa đơn cũ cùng period + apartment nếu có
        $store['invoices'] = array_values(array_filter($store['invoices'], fn($i) => !($i['billing_period_id'] === $period['id'] && $i['apartment_id'] === $apt['id'])));
        $store['invoices'][] = $newInvoice;

        $generatedCount++;
        $grandTotal += $invoiceTotal;
    }

    $period['status'] = 'GENERATED';
    $period['invoice_count'] = $generatedCount;
    $period['total_amount'] = (string)$grandTotal;

    saveStore($store);
    jsonSuccess(['generatedCount' => $generatedCount, 'status' => 'GENERATED']);
}

// Phát hành hóa đơn (Issue Period)
if (preg_match('#^/billing-periods/([^/]+)/issue$#', $normPath, $m) && $method === 'POST') {
    $periodId = $m[1];
    foreach ($store['billingPeriods'] as &$bp) {
        if ($bp['id'] === $periodId) {
            $bp['status'] = 'ISSUED';
            break;
        }
    }
    foreach ($store['invoices'] as &$inv) {
        if ($inv['billing_period_id'] === $periodId && $inv['status'] === 'DRAFT') {
            $inv['status'] = 'ISSUED';
        }
    }
    saveStore($store);
    jsonSuccess(['billingPeriodId' => $periodId, 'status' => 'ISSUED']);
}

// --- 6.11. Hóa đơn (Invoices) ---
if ($normPath === '/invoices' && $method === 'GET') {
    $currentUser = getCurrentUser($store);
    $invoices = $store['invoices'];
    // Nếu là tài khoản cư dân, lọc theo căn hộ
    if ($currentUser && !empty($currentUser['apartment_id'])) {
        $invoices = array_values(array_filter($invoices, fn($i) => $i['apartment_id'] === $currentUser['apartment_id'] && $i['status'] !== 'DRAFT'));
    }
    jsonSuccess(['invoices' => $invoices]);
}

if (preg_match('#^/invoices/([^/]+)$#', $normPath, $m) && $method === 'GET') {
    $invId = $m[1];
    $found = null;
    foreach ($store['invoices'] as $inv) {
        if ($inv['id'] === $invId) {
            $found = $inv;
            break;
        }
    }

    if (!$found) {
        jsonError('NOT_FOUND', 'Hóa đơn không tồn tại.', 404);
    }

    jsonSuccess([
        'invoice' => [
            'id' => $found['id'],
            'invoice_number' => $found['invoice_number'],
            'apartment_id' => $found['apartment_id'],
            'apartment_code' => $found['apartment_code'],
            'status' => $found['status'],
            'due_date' => $found['due_date'],
            'total_amount' => $found['total_amount'],
            'paid_amount' => $found['paid_amount'],
            'balance_due' => $found['balance_due'],
        ],
        'items' => $found['items'] ?? [],
        'payments' => $found['payments'] ?? [],
    ]);
}

// --- 6.12. Thanh toán (Payments) ---
if ($normPath === '/payments' && $method === 'POST') {
    $body = getJsonBody();
    $invId = $body['invoiceId'] ?? '';
    $amount = (float)($body['amount'] ?? 0);
    $methodType = $body['method'] ?? 'BANK_TRANSFER';
    $ref = $body['reference'] ?? null;
    $idempotencyKey = $body['idempotencyKey'] ?? ('tx-' . time());

    $targetIndex = null;
    foreach ($store['invoices'] as $idx => $inv) {
        if ($inv['id'] === $invId) {
            $targetIndex = $idx;
            break;
        }
    }

    if ($targetIndex === null) {
        jsonError('NOT_FOUND', 'Hóa đơn không tồn tại.', 404);
    }

    $invoice = &$store['invoices'][$targetIndex];
    $balance = (float)$invoice['balance_due'];

    if ($amount <= 0 || $amount > $balance) {
        jsonError('INVALID_AMOUNT', 'Số tiền thanh toán không hợp lệ hoặc vượt quá số dư nợ còn lại.');
    }

    $newBalance = max(0, $balance - $amount);
    $newPaid = (float)$invoice['paid_amount'] + $amount;

    $paymentRecord = [
        'id' => 'pay-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'amount' => (string)$amount,
        'method' => $methodType,
        'status' => 'RECORDED',
        'paid_at' => date('c'),
        'idempotency_key' => $idempotencyKey,
        'reference' => $ref,
    ];

    $invoice['paid_amount'] = (string)$newPaid;
    $invoice['balance_due'] = (string)$newBalance;
    $invoice['status'] = ($newBalance <= 0) ? 'PAID' : 'PARTIALLY_PAID';
    $invoice['payments'][] = $paymentRecord;

    saveStore($store);
    jsonSuccess(['payment' => $paymentRecord], 201);
}

// --- 6.13. Yêu cầu bảo trì (Maintenance Requests) ---
if ($normPath === '/maintenance-requests' && $method === 'GET') {
    $currentUser = getCurrentUser($store);
    $reqs = $store['maintenanceRequests'];
    if ($currentUser && !empty($currentUser['apartment_id'])) {
        $reqs = array_values(array_filter($reqs, fn($r) => $r['apartment_id'] === $currentUser['apartment_id']));
    }
    jsonSuccess(['maintenanceRequests' => $reqs]);
}

if ($normPath === '/maintenance-requests' && $method === 'POST') {
    $body = getJsonBody();
    $aptId = $body['apartmentId'] ?? 'apt-001';
    
    $aptCode = 'A-101';
    foreach ($store['apartments'] as $apt) {
        if ($apt['id'] === $aptId) {
            $aptCode = $apt['code'];
            break;
        }
    }

    $newReq = [
        'id' => 'req-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'apartment_id' => $aptId,
        'apartment_code' => $aptCode,
        'title' => trim($body['title'] ?? 'Yêu cầu bảo trì mới'),
        'description' => trim($body['description'] ?? ''),
        'priority' => $body['priority'] ?? 'MEDIUM',
        'status' => 'PENDING',
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    array_unshift($store['maintenanceRequests'], $newReq);
    saveStore($store);
    jsonSuccess(['request' => $newReq], 201);
}

if (preg_match('#^/maintenance-requests/([^/]+)$#', $normPath, $m) && $method === 'PATCH') {
    $reqId = $m[1];
    $body = getJsonBody();
    $newStatus = $body['status'] ?? 'IN_PROGRESS';
    $updated = null;

    foreach ($store['maintenanceRequests'] as &$req) {
        if ($req['id'] === $reqId) {
            $req['status'] = $newStatus;
            $req['updated_at'] = date('c');
            $updated = $req;
            break;
        }
    }

    saveStore($store);
    jsonSuccess(['request' => $updated]);
}

// --- 6.14. Bảng tin & Thông báo (Notifications) ---
if ($normPath === '/notifications' && $method === 'GET') {
    jsonSuccess(['notifications' => $store['notifications']]);
}

if ($normPath === '/notifications' && $method === 'POST') {
    $body = getJsonBody();
    $newNotice = [
        'id' => 'not-' . substr(bin2hex(random_bytes(4)), 0, 8),
        'building_id' => $body['buildingId'] ?? 'bld-001',
        'title' => trim($body['title'] ?? 'Thông báo mới'),
        'content' => trim($body['content'] ?? ''),
        'publish_at' => date('c'),
        'read_at' => null,
        'created_at' => date('c'),
    ];
    array_unshift($store['notifications'], $newNotice);
    saveStore($store);
    jsonSuccess(['notification' => $newNotice], 201);
}

if (preg_match('#^/notifications/([^/]+)/read$#', $normPath, $m) && $method === 'POST') {
    $notId = $m[1];
    $readTime = date('c');
    foreach ($store['notifications'] as &$n) {
        if ($n['id'] === $notId) {
            $n['read_at'] = $readTime;
            break;
        }
    }
    saveStore($store);
    jsonSuccess(['noticeId' => $notId, 'readAt' => $readTime]);
}

// --- 6.15. Endpoint không tìm thấy (404 Fallback) ---
jsonError('ROUTE_NOT_FOUND', "Endpoint {$method} {$normPath} không tồn tại trên Mock Backend.", 404);
