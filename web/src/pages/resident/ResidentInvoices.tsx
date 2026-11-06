import { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { InvoiceDetailModal, SepayModal } from "../../components/modals";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Invoice } from "../../types";
import { date, money } from "../../utils/format";

export function ResidentInvoices({ onBack }: { onBack?: () => void } = {}) {
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceForSepay, setSelectedInvoiceForSepay] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function pay(invoice: Invoice) {
    setBusy(invoice.id);
    setMessage("");
    try {
      const key = crypto.randomUUID();
      await api("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.balance_due,
          method: "SIMULATED",
          idempotencyKey: key,
        }),
      });
      invoices.reload();
      setMessage(`Thanh toán mô phỏng thành công cho hóa đơn ${invoice.invoice_number}.`);
    } catch (reason) {
      setMessage((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeading
        title="Hóa đơn của tôi"
        subtitle="Xem bảng kê chi tiết khoản phí và thực hiện thanh toán trực tuyến."
        onBack={onBack}
        backLabel="Trang chủ"
      />
      {message && (
        <div className="inline-message" role="status">
          {message}
        </div>
      )}
      {invoices.loading ? (
        <LoadingLine />
      ) : invoices.error ? (
        <ErrorBanner message={invoices.error} />
      ) : invoices.data?.length ? (
        <div className="resident-invoice-list">
          {invoices.data.map((invoice) => (
            <article className="surface resident-invoice" key={invoice.id}>
              <div className="invoice-symbol">
                <Icon name="invoice" />
              </div>
              <div className="invoice-main">
                <strong>{invoice.invoice_number}</strong>
                <small>
                  Căn {invoice.apartment_code} · Hạn {date(invoice.due_date)}
                </small>
                <StatusTag value={invoice.status} />
              </div>
              <div className="invoice-total">
                <small>Còn phải trả</small>
                <strong style={{ color: Number(invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>
                  {money(invoice.balance_due)}
                </strong>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="button button-quiet"
                  style={{ fontSize: "11px", padding: "6px 10px" }}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                >
                  Xem chi tiết
                </button>
                {Number(invoice.balance_due) > 0 && (
                  <>
                    <button
                      className="button button-primary"
                      style={{ fontSize: "11px", padding: "6px 10px", background: "#0284c7" }}
                      onClick={() => setSelectedInvoiceForSepay(invoice)}
                    >
                      Thanh toán QR SePay
                    </button>
                    <button
                      className="button button-quiet"
                      style={{ fontSize: "11px", padding: "6px 10px" }}
                      disabled={busy === invoice.id}
                      onClick={() => pay(invoice)}
                    >
                      {busy === invoice.id ? "Đang xử lý…" : "Mô phỏng nhanh"}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface">
          <EmptyState
            title="Chưa có hóa đơn"
            text="Hóa đơn sẽ hiển thị sau khi Ban quản lý phát hành kỳ thu."
          />
        </div>
      )}
      {selectedInvoiceId && (
        <InvoiceDetailModal invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />
      )}
      {selectedInvoiceForSepay && (
        <SepayModal
          invoice={selectedInvoiceForSepay}
          onClose={() => setSelectedInvoiceForSepay(null)}
          onSuccess={() => {
            setSelectedInvoiceForSepay(null);
            invoices.reload();
            setMessage(
              `Thanh toán thành công hóa đơn ${selectedInvoiceForSepay.invoice_number} qua SePay!`
            );
          }}
        />
      )}
    </>
  );
}
