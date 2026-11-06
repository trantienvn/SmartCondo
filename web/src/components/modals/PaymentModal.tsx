import React, { useState } from "react";
import { api } from "../../api";
import type { Invoice } from "../../types";
import { money } from "../../utils/format";
import { ErrorBanner } from "../common";

export function PaymentModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("BANK_TRANSFER");
  const [amount, setAmount] = useState(invoice.balance_due);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const key = crypto.randomUUID();
      await api("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: String(amount),
          method,
          reference: reference || null,
          idempotencyKey: key,
        }),
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Ghi nhận thanh toán - Hóa đơn {invoice.invoice_number}</h2>
          <button type="button" className="button button-quiet" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "4px", fontSize: "12px" }}>
            Căn hộ: <strong>{invoice.apartment_code}</strong> · Còn phải thu: <strong style={{ color: "#b91c1c" }}>{money(invoice.balance_due)}</strong>
          </div>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Phương thức thanh toán
            <select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "BANK_TRANSFER")}>
              <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
              <option value="CASH">Tiền mặt</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Số tiền thanh toán (₫)
            <input
              type="number"
              step="1"
              min="1000"
              max={invoice.balance_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Mã tham chiếu / Ghi chú (VD: Số GD ngân hàng)
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VD: FT26110892837"
            />
          </label>
          {error && <ErrorBanner message={error} />}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? "Đang xử lý…" : "Xác nhận thu tiền"}
          </button>
        </div>
      </form>
    </div>
  );
}
