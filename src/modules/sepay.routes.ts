import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db/pool.js";

const router = Router();

const SEPAY_AES_KEY = process.env.SEPAY_AES_SECRET_KEY || "SePaySecretKey2026_AES256Secure!";
const SEPAY_BANK_CODE = process.env.SEPAY_BANK_CODE || "ICB";
const SEPAY_ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER || "101880291746";
const SEPAY_ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || "TRAN VAN TIEN";

export interface SepayOrder {
  order_id: string;
  payment_code: string;
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string;
  description: string;
  qr_url: string;
  vietqr_url: string;
  expires_at: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  created_at: string;
  paid_at: string | null;
  paid_amount: number | null;
  transaction_id: number | null;
}

// In-memory runtime session cache for SePay orders
const sepayOrders = new Map<string, SepayOrder>();

export function encryptAes(payload: unknown, secretKey: string = SEPAY_AES_KEY): { iv: string; data: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, "utf-8"), iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf-8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptAes(packet: { iv: string; data: string }, secretKey: string = SEPAY_AES_KEY): any {
  if (!packet || typeof packet.iv !== "string" || typeof packet.data !== "string") {
    throw new Error("Invalid encrypted packet format. 'iv' and 'data' required.");
  }
  const iv = Buffer.from(packet.iv, "base64");
  if (iv.length !== 16) {
    throw new Error("Invalid IV length. Expected 16 bytes.");
  }
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(secretKey, "utf-8"), iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(packet.data, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf-8"));
}

async function markInvoicePaid(invoiceId: string, amount: number, paymentCode: string, txId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inv = await client.query("SELECT id, total_amount, paid_amount, balance_due FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
    if (inv.rowCount) {
      const current = inv.rows[0];
      const newPaid = Number(current.paid_amount) + amount;
      const newBalance = Math.max(0, Number(current.balance_due) - amount);
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

      await client.query(
        "UPDATE invoices SET paid_amount = $1, balance_due = $2, status = $3, updated_at = now() WHERE id = $4",
        [newPaid, newBalance, newStatus, current.id]
      );

      await client.query(
        `INSERT INTO payments (invoice_id, amount, method, status, idempotency_key, paid_at)
         VALUES ($1, $2, 'BANK_TRANSFER', 'RECORDED', $3, now())`,
        [current.id, amount, `sepay-${paymentCode}-${txId}`]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error marking invoice paid via SePay:", err);
  } finally {
    client.release();
  }
}

// Router handler
router.post("/", async (request, response) => {
  const body = request.body ?? {};

  // Case 1: Client encrypted AES payload
  if (body.iv && body.data) {
    let decrypted: any;
    try {
      decrypted = decryptAes(body);
    } catch (err) {
      response.status(400).json({ success: false, error: { code: "AES_DECRYPTION_FAILED", message: (err as Error).message } });
      return;
    }

    const action = decrypted.action;

    // API 1: create_payment
    if (action === "create_payment") {
      const amount = Number(decrypted.amount ?? 50000);
      const orderId = String(decrypted.order_id || `ORD${Date.now()}${Math.floor(100 + Math.random() * 900)}`);
      const description = String(decrypted.description || `Thanh toan don hang #${orderId}`);

      // Mandatory SEVQR + 6 random digits
      const paymentCode = `SEVQR${Math.floor(100000 + Math.random() * 900000)}`;
      const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 mins

      const qrUrl = `https://qr.sepay.vn/img?bank=${SEPAY_BANK_CODE}&acc=${SEPAY_ACCOUNT_NUMBER}&template=compact&amount=${amount}&des=${paymentCode}`;
      const vietqrUrl = `https://img.vietqr.io/image/${SEPAY_BANK_CODE}-${SEPAY_ACCOUNT_NUMBER}-compact2.png?amount=${amount}&addInfo=${paymentCode}&accountName=${encodeURIComponent(SEPAY_ACCOUNT_NAME)}`;

      const order: SepayOrder = {
        order_id: orderId,
        payment_code: paymentCode,
        amount,
        bank_code: SEPAY_BANK_CODE,
        account_number: SEPAY_ACCOUNT_NUMBER,
        account_name: SEPAY_ACCOUNT_NAME,
        description,
        qr_url: qrUrl,
        vietqr_url: vietqrUrl,
        expires_at: expiresAt,
        status: "PENDING",
        created_at: new Date().toISOString(),
        paid_at: null,
        paid_amount: null,
        transaction_id: null,
      };

      sepayOrders.set(paymentCode, order);

      const resPayload = {
        success: true,
        action: "create_payment",
        order_id: orderId,
        payment_code: paymentCode,
        amount,
        bank_code: SEPAY_BANK_CODE,
        account_number: SEPAY_ACCOUNT_NUMBER,
        account_name: SEPAY_ACCOUNT_NAME,
        qr_url: qrUrl,
        vietqr_url: vietqrUrl,
        expires_at: expiresAt,
        status: "PENDING",
        message: "Tạo mã thanh toán thành công",
      };

      response.json(encryptAes(resPayload));
      return;
    }

    // API 2: check_status (Polling every 2s)
    if (action === "check_status") {
      const rawCode = String(decrypted.payment_code ?? "");
      const normCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      let matched: SepayOrder | undefined;
      for (const [code, ord] of sepayOrders.entries()) {
        if (code.toUpperCase().replace(/[^A-Z0-9]/g, "") === normCode) {
          matched = ord;
          break;
        }
      }

      if (!matched) {
        response.status(404).json(encryptAes({
          success: false,
          status: "NOT_FOUND",
          message: "Không tìm thấy thông tin đơn hàng.",
        }));
        return;
      }

      // Check timeout 15 mins
      const nowSec = Math.floor(Date.now() / 1000);
      if (matched.status === "PENDING" && nowSec > matched.expires_at) {
        matched.status = "EXPIRED";
        response.json(encryptAes({
          success: true,
          status: "EXPIRED",
          message: "Đơn hàng đã hết hạn thanh toán",
        }));
        return;
      }

      if (matched.status === "PAID") {
        response.json(encryptAes({
          success: true,
          status: "PAID",
          message: "Đã nhận được thanh toán thành công!",
          payment_info: {
            order_id: matched.order_id,
            payment_code: matched.payment_code,
            amount: matched.amount,
            paid_amount: matched.paid_amount ?? matched.amount,
            paid_at: matched.paid_at ?? new Date().toISOString(),
            transaction_id: matched.transaction_id ?? Math.floor(100000 + Math.random() * 900000),
            gateway: matched.bank_code,
            bank_code: matched.bank_code,
            account_number: matched.account_number,
          },
        }));
        return;
      }

      // PENDING
      response.json(encryptAes({
        success: true,
        status: "PENDING",
        message: "Đang chờ khách hàng thanh toán...",
        order_id: matched.order_id,
        payment_code: matched.payment_code,
        amount: matched.amount,
      }));
      return;
    }

    // API 3: list_paid
    if (action === "list_paid") {
      const paid = Array.from(sepayOrders.values())
        .filter((o) => o.status === "PAID")
        .map((o) => ({
          order_id: o.order_id,
          payment_code: o.payment_code,
          amount: o.amount,
          status: o.status,
          paid_at: o.paid_at,
          transaction_id: o.transaction_id,
        }));
      response.json(encryptAes({
        success: true,
        total: paid.length,
        orders: paid,
      }));
      return;
    }

    // Demo Action: simulate_webhook
    if (action === "simulate_webhook" || action === "simulate_transfer") {
      const rawCode = String(decrypted.payment_code ?? "");
      const normCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      let matched: SepayOrder | undefined;
      for (const [code, ord] of sepayOrders.entries()) {
        if (code.toUpperCase().replace(/[^A-Z0-9]/g, "") === normCode) {
          matched = ord;
          break;
        }
      }

      if (matched) {
        const txId = Math.floor(800000 + Math.random() * 200000);
        matched.status = "PAID";
        matched.paid_at = new Date().toISOString();
        matched.paid_amount = matched.amount;
        matched.transaction_id = txId;

        await markInvoicePaid(matched.order_id, matched.amount, matched.payment_code, txId);

        response.json(encryptAes({
          success: true,
          message: "Mô phỏng chuyển khoản thành công",
          payment_code: matched.payment_code,
        }));
        return;
      }
      response.status(404).json(encryptAes({ success: false, message: "Mã thanh toán không tồn tại" }));
      return;
    }

    response.status(400).json({ success: false, error: { code: "UNKNOWN_ACTION", message: `Hành động '${action}' không được hỗ trợ.` } });
    return;
  }

  // Case 2: Standard SePay Webhook JSON (unencrypted)
  const content = String(body.content ?? "");
  const transferAmount = Number(body.transferAmount ?? 0);
  const txId = Number(body.id ?? Math.floor(800000 + Math.random() * 200000));
  const gateway = String(body.gateway ?? SEPAY_BANK_CODE);

  let matchedCode: string | null = null;
  const match = content.match(/SEVQR[\s\-]*([0-9]{6})/i);
  if (match) {
    matchedCode = `SEVQR${match[1]}`;
  } else {
    const clean = content.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const match2 = clean.match(/SEVQR([0-9]{6})/);
    if (match2) matchedCode = `SEVQR${match2[1]}`;
  }

  if (!matchedCode || !sepayOrders.has(matchedCode)) {
    response.json({ success: false, message: `Không tìm thấy đơn hàng tương ứng với mã ${matchedCode || "SEVQR"}` });
    return;
  }

  const order = sepayOrders.get(matchedCode)!;
  if (order.status === "PAID") {
    response.json({ success: true, message: "Already processed" });
    return;
  }

  order.status = "PAID";
  order.paid_at = String(body.transactionDate || new Date().toISOString());
  order.paid_amount = transferAmount || order.amount;
  order.transaction_id = txId;
  order.bank_code = gateway;

  await markInvoicePaid(order.order_id, order.paid_amount, matchedCode, txId);

  response.json({ success: true, message: "Thanh toán đơn hàng thành công qua SePay Webhook." });
});

export default router;
