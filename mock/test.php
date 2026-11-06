<?php
// Test runner for mock/server.php

if (file_exists(__DIR__ . '/store.json')) {
    unlink(__DIR__ . '/store.json');
}

function simulate(string $method, string $uri, array $body = [], ?string $token = null): array {
    $descriptors = [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"],
    ];
    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/server.php');
    $env = [
        'PATH' => getenv('PATH'),
        'SystemRoot' => getenv('SystemRoot'),
        'REQUEST_METHOD' => $method,
        'REQUEST_URI' => $uri,
        'HTTP_AUTHORIZATION' => $token ? "Bearer $token" : '',
    ];

    $input = json_encode($body);
    $process = proc_open($cmd, $descriptors, $pipes, __DIR__, $env);
    if (is_resource($process)) {
        fwrite($pipes[0], $input);
        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        proc_close($process);

        $json = json_decode($output, true);
        return [
            'raw' => $output,
            'json' => $json,
            'stderr' => $stderr,
        ];
    }
    return ['raw' => '', 'json' => null, 'stderr' => 'Failed to start process'];
}

echo "1. Testing /api/v1/health...\n";
$res = simulate('GET', '/api/v1/health');
assert($res['json']['data']['status'] === 'healthy');
echo "   -> PASS\n";

echo "2. Testing /api/v1/auth/login (manager)...\n";
$loginRes = simulate('POST', '/api/v1/auth/login', [
    'email' => 'manager@smartcondo.vn',
    'password' => 'Manager@123',
]);
$token = $loginRes['json']['data']['accessToken'] ?? null;
assert(!empty($token));
echo "   -> PASS (Token: $token)\n";

echo "3. Testing /api/v1/dashboard/summary...\n";
$dashRes = simulate('GET', '/api/v1/dashboard/summary', [], $token);
assert(($dashRes['json']['data']['apartments']['total'] ?? 0) === 4);
echo "   -> PASS (Apartments: 4)\n";

echo "4. Testing /api/v1/utility-readings (Create reading)...\n";
$createReading = simulate('POST', '/api/v1/utility-readings', [
    'apartmentId' => 'apt-001',
    'periodStart' => '2026-11-01',
    'periodEnd' => '2026-11-30',
    'electricPrevious' => 1480,
    'electricCurrent' => 1710,
    'waterPrevious' => 158,
    'waterCurrent' => 176,
    'note' => 'Ghi chỉ số tháng 11',
], $token);
assert(!empty($createReading['json']['data']['reading']['id']));
echo "   -> PASS (Created reading: " . $createReading['json']['data']['reading']['id'] . ")\n";

echo "5. Testing /api/v1/billing-periods (Generate invoices for bp-2026-11)...\n";
$genRes = simulate('POST', '/api/v1/billing-periods/bp-2026-11/generate', [], $token);
assert(($genRes['json']['data']['generatedCount'] ?? 0) > 0);
echo "   -> PASS (Generated count: " . $genRes['json']['data']['generatedCount'] . ")\n";

echo "6. Testing /api/v1/billing-periods (Issue bp-2026-11)...\n";
$issueRes = simulate('POST', '/api/v1/billing-periods/bp-2026-11/issue', [], $token);
assert(($issueRes['json']['data']['status'] ?? '') === 'ISSUED');
echo "   -> PASS (Issued)\n";

echo "7. Testing /api/v1/invoices/:id (Detail)...\n";
$detailRes = simulate('GET', '/api/v1/invoices/inv-001', [], $token);
assert(count($detailRes['json']['data']['items'] ?? []) > 0);
echo "   -> PASS (" . count($detailRes['json']['data']['items']) . " line items)\n";

echo "8. Testing /api/v1/payments (Pay invoice inv-001)...\n";
$payRes = simulate('POST', '/api/v1/payments', [
    'invoiceId' => 'inv-001',
    'amount' => 1725000,
    'method' => 'BANK_TRANSFER',
    'reference' => 'TEST-PAY-01',
    'idempotencyKey' => 'key-test-123',
], $token);
assert(($payRes['json']['data']['payment']['status'] ?? '') === 'RECORDED');
echo "   -> PASS (Paid 1,725,000 VND)\n";

echo "9. Testing /api/v1/invoices/inv-001 after payment...\n";
$invAfter = simulate('GET', '/api/v1/invoices/inv-001', [], $token);
assert($invAfter['json']['data']['invoice']['status'] === 'PAID');
assert((float)$invAfter['json']['data']['invoice']['balance_due'] === 0.0);
echo "   -> PASS (Balance due: 0, status: PAID)\n";

echo "10. Testing /api/v1/demo/seed (Reset state)...\n";
$seedRes = simulate('POST', '/api/v1/demo/seed', [], $token);
assert(!empty($seedRes['json']['data']['message']));
echo "   -> PASS (Reset completed)\n";

echo "\n>>> ALL 10 TESTS PASSED BEAUTIFULLY! <<<\n";
