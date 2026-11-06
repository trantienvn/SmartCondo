import { useRemote } from "../../hooks/useRemote";
import type { InvoiceDetail } from "../../types";
import { date, money } from "../../utils/format";
import { ErrorBanner, LoadingLine, StatusTag } from "../common";

export function InvoiceDetailModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const detail = useRemote<InvoiceDetail>(invoiceId ? `/invoices/${invoiceId}` : "");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Chi tiết hóa đơn {detail.data?.invoice.invoice_number ?? "..."}</h2>
            <small style={{ color: "#64748b" }}>Căn hộ: {detail.data?.invoice.apartment_code}</small>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="modal-body">
          {detail.loading ? (
            <LoadingLine />
          ) : detail.error ? (
            <ErrorBanner message={detail.error} />
          ) : detail.data ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
                <div><small style={{ color: "#64748b", display: "block" }}>Trạng thái</small><StatusTag value={detail.data.invoice.status} /></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Hạn nộp</small><strong>{date(detail.data.invoice.due_date)}</strong></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Tổng tiền</small><strong>{money(detail.data.invoice.total_amount)}</strong></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Còn nợ</small><strong style={{ color: Number(detail.data.invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>{money(detail.data.invoice.balance_due)}</strong></div>
              </div>

              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, margin: "8px 0" }}>Bảng kê chi tiết các khoản phí</h3>
                {detail.data.items.length ? (
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Khoản phí</th>
                        <th style={{ textAlign: "right" }}>Số lượng / Tiêu thụ</th>
                        <th style={{ textAlign: "right" }}>Đơn giá</th>
                        <th style={{ textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.items.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.fee_name ?? item.description}</strong></td>
                          <td style={{ textAlign: "right" }}>{Number(item.quantity).toLocaleString("vi-VN")}</td>
                          <td style={{ textAlign: "right" }}>{money(item.unit_price)}</td>
                          <td style={{ textAlign: "right" }}><strong>{money(item.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#64748b", fontSize: "11px" }}>Chưa có chi tiết dòng phí.</p>
                )}
                <div className="breakdown-total">Tổng cộng: {money(detail.data.invoice.total_amount)}</div>
              </div>

              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, margin: "8px 0" }}>Lịch sử thanh toán</h3>
                {detail.data.payments.length ? (
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Phương thức</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: "right" }}>Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{date(p.paid_at)}</td>
                          <td>{p.method === "CASH" ? "Tiền mặt" : p.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Mô phỏng"}</td>
                          <td><StatusTag value={p.status} /></td>
                          <td style={{ textAlign: "right", color: "#15803d" }}><strong>{money(p.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#64748b", fontSize: "11px" }}>Chưa ghi nhận khoản thanh toán nào cho hóa đơn này.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
