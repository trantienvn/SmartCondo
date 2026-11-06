<?php
/**
 * SmartCondo - SePay API Gateway Endpoint (/api.php)
 * 
 * Endpoint tiếp nhận và xử lý các yêu cầu:
 * - create_payment (AES encrypted)
 * - check_status (AES encrypted)
 * - list_paid (AES encrypted)
 * - simulate_webhook (AES encrypted)
 * - SePay Webhook trực tiếp từ ngân hàng
 */

require_once __DIR__ . '/server.php';
