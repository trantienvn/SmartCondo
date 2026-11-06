import { useEffect, useState } from "react";
import { api } from "../../api";
import {
  decryptPayload,
  DEFAULT_SEPAY_API_URL,
  DEFAULT_SEPAY_WEBHOOK_URL,
  encryptPayload,
} from "../../crypto";
import type { Invoice } from "../../types";
import { money } from "../../utils/format";
import { ErrorBanner, LoadingLine } from "../common";

export interface SepayPaymentResponse {
  success: boolean;
  action?: string;
  order_id: string;
  payment_code: string;
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string;
  qr_url: string;
  vietqr_url?: string;
  expires_at: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  message?: string;
}

export interface SepayStatusResponse {
  success: boolean;
  status: "PENDING" | "PAID" | "EXPIRED";
  message?: string;
  order_id?: string;
  payment_code?: string;
  amount?: number;
  payment_info?: {
    order_id: string;
    payment_code: string;
    amount: number;
    paid_amount: number;
    paid_at: string;
    transaction_id: string | number;
    gateway?: string;
    bank_code?: string;
    account_number?: string;
  };
}

export function SepayModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<SepayPaymentResponse | null>(null);
  const [status, setStatus] = useState<"PENDING" | "PAID" | "EXPIRED">("PENDING");
  const [paidInfo, setPaidInfo] = useState<SepayStatusResponse["payment_info"] | null>(null);
  const [timeLeft, setTimeLeft] = useState(900);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (status === "PAID") {
          onSuccess();
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onSuccess, status]);

  async function initPayment() {
    setLoading(true);
    setError("");
    try {
      const payload = {
        action: "create_payment",
        order_id: invoice.id ? `INV_${invoice.invoice_number}` : undefined,
        amount: Math.round(Number(invoice.balance_due)),
        description: `Thanh toan hoa don ${invoice.invoice_number} ${invoice.apartment_code}`,
      };
      const packet = await encryptPayload(payload);
      const res = await fetch(DEFAULT_SEPAY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packet),
      });
      if (!res.ok) {
        throw new Error(`Máy chủ phản hồi lỗi (${res.status})`);
      }
      const dataPacket = await res.json();
      const dec = await decryptPayload<SepayPaymentResponse>(dataPacket);
      if (!dec.success) {
        throw new Error(dec.message || "Không thể khởi tạo mã thanh toán SePay");
      }
      setPaymentData(dec);
      setStatus(dec.status || "PENDING");
      if (dec.expires_at) {
        const diff = Math.max(0, dec.expires_at - Math.floor(Date.now() / 1000));
        setTimeLeft(diff);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initPayment();
  }, [invoice.id]);

  // Lắng nghe trạng thái (Polling 2s) qua endpoint SePay ngoài https://trantien.id.vn/webcheck/api.php
  useEffect(() => {
    if (!paymentData?.payment_code || status !== "PENDING") return;
    const interval = setInterval(async () => {
      try {
        const payload = {
          action: "check_status",
          payment_code: paymentData.payment_code,
        };
        const packet = await encryptPayload(payload);
        const res = await fetch(DEFAULT_SEPAY_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(packet),
        });
        if (!res.ok) return;
        const dataPacket = await res.json();
        const dec = await decryptPayload<SepayStatusResponse>(dataPacket);
        if (dec.status === "PAID") {
          setStatus("PAID");
          setPaidInfo(dec.payment_info);
          // Gạch nợ tự động vào hệ thống SmartCondo
          try {
            const pCode = dec.payment_info?.payment_code || paymentData.payment_code;
            const key = `sepay-${pCode}`;
            await api("/payments", {
              method: "POST",
              headers: { "Idempotency-Key": key },
              body: JSON.stringify({
                invoiceId: invoice.id,
                amount: String(dec.payment_info?.paid_amount || invoice.balance_due),
                method: "BANK_TRANSFER",
                reference: `SePay #${pCode} TransID:${dec.payment_info?.transaction_id || ""}`,
                idempotencyKey: key,
              }),
            });
          } catch {
            // Đã ghi nhận
          }
        } else if (dec.status === "EXPIRED") {
          setStatus("EXPIRED");
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [paymentData?.payment_code, status]);

  // Bộ đếm thời gian 15 phút
  useEffect(() => {
    if (status !== "PENDING" || !paymentData?.expires_at) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, paymentData.expires_at - Math.floor(Date.now() / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        setStatus("EXPIRED");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentData?.expires_at, status]);

  async function handleSimulateWebhook() {
    if (!paymentData?.payment_code) return;
    setSimulating(true);
    try {
      // 1. Gửi Webhook tới SePay Webhook Endpoint ngoài: https://trantien.id.vn/webcheck/sepaywebhook.php
      const webhookPayload = {
        id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
        gateway: paymentData.bank_code || "ICB",
        transactionDate: new Date().toISOString().replace("T", " ").slice(0, 19),
        accountNumber: paymentData.account_number || "101880291746",
        transferType: "in",
        transferAmount: paymentData.amount,
        content: `${paymentData.payment_code} thanh toan SmartCondo`,
      };

      await fetch(DEFAULT_SEPAY_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Apikey apikey",
        },
        body: JSON.stringify(webhookPayload),
      });

      // 2. Poll ngay lập tức lên https://trantien.id.vn/webcheck/api.php
      const req = await encryptPayload({
        action: "check_status",
        payment_code: paymentData.payment_code,
      });
      const res = await fetch(DEFAULT_SEPAY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const dataPacket = await res.json();
        const dec = await decryptPayload<SepayStatusResponse>(dataPacket);
        if (dec.status === "PAID") {
          setStatus("PAID");
          setPaidInfo(dec.payment_info);
          try {
            const pCode = dec.payment_info?.payment_code || paymentData.payment_code;
            const key = `sepay-${pCode}`;
            await api("/payments", {
              method: "POST",
              headers: { "Idempotency-Key": key },
              body: JSON.stringify({
                invoiceId: invoice.id,
                amount: String(dec.payment_info?.paid_amount || invoice.balance_due),
                method: "BANK_TRANSFER",
                reference: `SePay #${pCode} TransID:${dec.payment_info?.transaction_id || ""}`,
                idempotencyKey: key,
              }),
            });
          } catch {
            // Đã ghi nhận
          }
        }
      }
    } catch (err) {
      alert("Lỗi mô phỏng chuyển khoản: " + (err as Error).message);
    } finally {
      setSimulating(false);
    }
  }

  function copyCode() {
    if (!paymentData?.payment_code) return;
    navigator.clipboard.writeText(paymentData.payment_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const ss = Math.floor(timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Thanh toán VietQR / SePay tự động</h2>
            <small style={{ color: "#64748b" }}>
              Hóa đơn <strong>{invoice.invoice_number}</strong> · Căn hộ: <strong>{invoice.apartment_code}</strong>
            </small>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <LoadingLine />
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "12px" }}>
                🔒 Đang khởi tạo giao dịch bảo mật AES-256-CBC với SePay Gateway...
              </p>
            </div>
          )}

          {error && (
            <div style={{ display: "grid", gap: "12px" }}>
              <ErrorBanner message={error} />
              <button className="button button-primary" onClick={initPayment}>Thử lại</button>
            </div>
          )}

          {!loading && !error && status === "PAID" && (
            <div className="sepay-success">
              <div className="sepay-success-icon">✓</div>
              <h3 style={{ margin: 0, color: "#15803d", fontSize: "18px" }}>Xác thực thanh toán thành công!</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                Hệ thống SePay đã nhận tiền và tự động gạch nợ thành công cho hóa đơn <strong>{invoice.invoice_number}</strong>.
              </p>
              <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px", fontSize: "12px", display: "grid", gap: "6px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Mã thanh toán:</span>
                  <strong style={{ fontFamily: "monospace", color: "#0369a1" }}>{paidInfo?.payment_code || paymentData?.payment_code}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Số tiền đã chuyển:</span>
                  <strong style={{ color: "#15803d" }}>{money(paidInfo?.paid_amount || paymentData?.amount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Mã giao dịch (Trans ID):</span>
                  <strong>{paidInfo?.transaction_id || paymentData?.order_id}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Thời gian ghi nhận:</span>
                  <span>{paidInfo?.paid_at || new Date().toLocaleString("vi-VN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Cổng thanh toán:</span>
                  <span>{paidInfo?.gateway || paidInfo?.bank_code || paymentData?.bank_code} (SePay Verified)</span>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && status === "EXPIRED" && (
            <div style={{ textAlign: "center", padding: "30px 10px", display: "grid", gap: "12px" }}>
              <div style={{ fontSize: "36px" }}>⏳</div>
              <h3 style={{ margin: 0, color: "#b91c1c" }}>Đơn hàng đã hết hạn thanh toán</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                Mã VietQR chỉ có hiệu lực trong 15 phút. Vui lòng bấm tạo lại để lấy mã thanh toán mới.
              </p>
              <div>
                <button className="button button-primary" onClick={initPayment}>Tạo mã QR thanh toán mới</button>
              </div>
            </div>
          )}

          {!loading && !error && status === "PENDING" && paymentData && (
            <div className="sepay-container">
              <div className="sepay-qr-box">
                <img
                  src={paymentData.vietqr_url || paymentData.qr_url}
                  alt={`VietQR ${paymentData.payment_code}`}
                />
                <small style={{ marginTop: "8px", color: "#64748b", fontSize: "10px" }}>
                  Mở ứng dụng Mobile Banking quét mã VietQR để thanh toán tự động
                </small>
              </div>

              <div className="sepay-info">
                <div className="sepay-row">
                  <span style={{ color: "#64748b" }}>Ngân hàng thụ hưởng:</span>
                  <strong>{paymentData.bank_code}</strong>
                </div>
                <div className="sepay-row">
                  <span style={{ color: "#64748b" }}>Số tài khoản:</span>
                  <strong style={{ letterSpacing: "0.5px" }}>{paymentData.account_number}</strong>
                </div>
                <div className="sepay-row">
                  <span style={{ color: "#64748b" }}>Chủ tài khoản:</span>
                  <strong>{paymentData.account_name}</strong>
                </div>
                <div className="sepay-row">
                  <span style={{ color: "#64748b" }}>Số tiền cần chuyển:</span>
                  <strong style={{ color: "#b91c1c", fontSize: "14px" }}>{money(paymentData.amount)}</strong>
                </div>

                <div className="sepay-code-box">
                  <div>
                    <small style={{ display: "block", color: "#0369a1", fontWeight: 600 }}>Nội dung chuyển khoản (bắt buộc):</small>
                    <strong>{paymentData.payment_code}</strong>
                  </div>
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={copyCode}
                  >
                    {copied ? "✓ Đã chép" : "Sao chép"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                  <span className="sepay-pulse">
                    <span className="sepay-pulse-dot" /> Đang lắng nghe chuyển khoản (Polling 2s)...
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                    Hết hạn: {mm}:{ss}
                  </span>
                </div>

                <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "10px", marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }}>⚡ Kiểm thử demo SePay:</span>
                    <button
                      type="button"
                      className="button button-primary"
                      style={{ fontSize: "11px", padding: "4px 10px", background: "#059669" }}
                      disabled={simulating}
                      onClick={handleSimulateWebhook}
                    >
                      {simulating ? "Đang gửi webhook..." : "Mô phỏng khách chuyển tiền"}
                    </button>
                  </div>
                  <small style={{ color: "#64748b", fontSize: "10px", display: "block" }}>
                    Bấm nút trên để giả lập SePay bắn webhook khớp mã <strong>{paymentData.payment_code}</strong> và gạch nợ tức thì.
                  </small>
                </div>

                <div style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🔒</span> Bảo mật <strong>AES-256-CBC</strong> 2 đầu qua Gateway ngoài: <code>https://trantien.id.vn/webcheck/api.php</code>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {status === "PAID" ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              Hoàn tất & Đóng
            </button>
          ) : (
            <button type="button" className="button button-quiet" onClick={onClose}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
