<?php
/**
 * Test SePay AES-256-CBC End-to-End Workflow via simulate()
 */

if (file_exists(__DIR__ . '/store.json')) {
    unlink(__DIR__ . '/store.json');
}

const SEPAY_AES_KEY = 'SePaySecretKey2026_AES256Secure!';

function encryptAes(array $payload, string $secretKey = SEPAY_AES_KEY): array {
    $iv = random_bytes(16);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    $ciphertext = openssl_encrypt($json, 'AES-256-CBC', $secretKey, OPENSSL_RAW_DATA, $iv);
    return [
        'iv' => base64_encode($iv),
        'data' => base64_encode($ciphertext),
    ];
}

function decryptAes(array $packet, string $secretKey = SEPAY_AES_KEY): array {
    $iv = base64_decode($packet['iv'], true);
    $ciphertext = base64_decode($packet['data'], true);
    $decrypted = openssl_decrypt($ciphertext, 'AES-256-CBC', $secretKey, OPENSSL_RAW_DATA, $iv);
    return json_decode($decrypted, true);
}

function simulate(string $method, string $uri, array $body = []): array {
    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/server.php');
    $env = [
        'PATH' => getenv('PATH'),
        'SystemRoot' => getenv('SystemRoot'),
        'REQUEST_METHOD' => $method,
        'REQUEST_URI' => $uri,
    ];

    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"],
    ];

    $process = proc_open($cmd, $descriptors, $pipes, __DIR__, $env);
    if (is_resource($process)) {
        fwrite($pipes[0], json_encode($body));
        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        proc_close($process);

        if ($stderr) {
            echo "STDERR: " . $stderr . "\n";
        }
        return json_decode($output, true) ?? ['raw' => $output, 'stderr' => $stderr];
    }
    return ['error' => 'process failed'];
}

echo ">>> Bắt đầu Kiểm thử Tự động Cổng Thanh toán SePay (AES-256-CBC) <<<\n\n";

// 1. Client gửi create_payment mã hóa AES lên /api.php
echo "1. Client gọi 'create_payment' (mã hóa AES) lên /api.php...\n";
$createReq = [
    'action' => 'create_payment',
    'order_id' => 'inv-001',
    'amount' => 1725000,
    'description' => 'Thanh toan hoa don INV-202610-A101',
];
$encReq = encryptAes($createReq);
$res1 = simulate('POST', '/api.php', $encReq);
assert(!empty($res1['iv']) && !empty($res1['data']));
$decRes1 = decryptAes($res1);
assert($decRes1['success'] === true);
assert(str_starts_with($decRes1['payment_code'], 'SEVQR'));
assert(!empty($decRes1['qr_url']));
assert(!empty($decRes1['vietqr_url']));
$paymentCode = $decRes1['payment_code'];
echo "   -> PASS! Nhận mã: {$paymentCode}, VietQR: {$decRes1['vietqr_url']}\n";

// 2. Client Polling check_status khi PENDING
echo "2. Client Polling 'check_status' (mã hóa AES)...\n";
$checkReq = [
    'action' => 'check_status',
    'payment_code' => $paymentCode,
];
$res2 = simulate('POST', '/api.php', encryptAes($checkReq));
$decRes2 = decryptAes($res2);
assert($decRes2['status'] === 'PENDING');
echo "   -> PASS! Trạng thái đơn hàng: PENDING ({$decRes2['message']})\n";

// 3. Mô phỏng Webhook SePay chuyển khoản khớp mã
echo "3. SePay bắn Webhook báo chuyển khoản (Nội dung: '{$paymentCode} Tien dien nuoc')...\n";
$webhookBody = [
    'id' => 991122,
    'gateway' => 'MBBank',
    'transactionDate' => date('Y-m-d H:i:s'),
    'accountNumber' => '1017588888',
    'content' => "{$paymentCode} Tien dien nuoc",
    'transferType' => 'in',
    'transferAmount' => 1725000,
];
$res3 = simulate('POST', '/api.php', $webhookBody);
assert($res3['success'] === true);
$msg = $res3['data']['message'] ?? $res3['message'] ?? 'Thành công';
echo "   -> PASS! Webhook xử lý: {$msg}\n";

// 4. Client Polling lại check_status -> Nhận PAID
echo "4. Client Polling lại 'check_status' -> Nhận trạng thái PAID...\n";
$res4 = simulate('POST', '/api.php', encryptAes($checkReq));
$decRes4 = decryptAes($res4);
assert($decRes4['status'] === 'PAID');
assert($decRes4['payment_info']['transaction_id'] == 991122);
echo "   -> PASS! Client nhận trạng thái PAID (Transaction #{$decRes4['payment_info']['transaction_id']}) -> CLIENT OK!\n";

// 5. Kiểm tra hóa đơn inv-001 đã được cập nhật số nợ về 0
echo "5. Kiểm tra hóa đơn inv-001...\n";
$invCheck = simulate('GET', '/invoices/inv-001');
assert($invCheck['data']['invoice']['status'] === 'PAID');
assert((float)$invCheck['data']['invoice']['balance_due'] === 0.0);
echo "   -> PASS! Hóa đơn inv-001 đã chuyển sang PAID, balance_due = 0 ₫\n";

// 6. Kiểm tra API list_paid
echo "6. Gọi 'list_paid' (mã hóa AES)...\n";
$res6 = simulate('POST', '/api.php', encryptAes(['action' => 'list_paid']));
$decRes6 = decryptAes($res6);
assert($decRes6['success'] === true);
assert($decRes6['total'] >= 1);
echo "   -> PASS! Tổng số đơn đã thanh toán: {$decRes6['total']}\n";

echo "\n>>> TẤT CẢ 6 BƯỚC TEST SEPAY HOÀN TOÀN THÀNH CÔNG! <<<\n";
