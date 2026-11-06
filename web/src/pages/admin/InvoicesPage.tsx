import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { InvoiceDetailModal, PaymentModal, SepayModal } from "../../components/modals";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { ApiResult, BillingPeriod, Building, Invoice } from "../../types";
import { date, money } from "../../utils/format";

export function InvoicesPage({
  canManage,
  notify,
  onBack,
}: {
  canManage: boolean;
  notify: (message: string) => void;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<"invoices" | "periods">("invoices");
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const periods = useRemote<BillingPeriod[]>("/billing-periods", "billingPeriods");
  const buildings = useRemote<Building[]>("/buildings", "buildings");

  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<string | null>(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [selectedInvoiceForSepay, setSelectedInvoiceForSepay] = useState<Invoice | null>(null);
  const [openCreatePeriod, setOpenCreatePeriod] = useState(false);
  const [periodError, setPeriodError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function createPeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPeriodError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/billing-periods", {
        method: "POST",
        body: JSON.stringify({
          buildingId: form.get("buildingId"),
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          dueDate: form.get("dueDate"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenCreatePeriod(false);
      periods.reload();
      notify("Đã tạo kỳ thu phí mới.");
    } catch (err) {
      setPeriodError((err as Error).message);
    }
  }

  async function generateInvoices(periodId: string) {
    setBusyAction(`gen-${periodId}`);
    try {
      const res = await api<ApiResult<{ generatedCount: number }>>(`/billing-periods/${periodId}/generate`, {
        method: "POST",
      });
      periods.reload();
      invoices.reload();
      notify(`Đã tự động tính toán và tạo ${res.data?.generatedCount ?? 0} hóa đơn.`);
    } catch (err) {
      notify(`Lỗi sinh hóa đơn: ${(err as Error).message}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function issuePeriod(periodId: string) {
    setBusyAction(`issue-${periodId}`);
    try {
      await api(`/billing-periods/${periodId}/issue`, { method: "POST" });
      periods.reload();
      invoices.reload();
      notify("Đã phát hành hóa đơn của kỳ thu thành công tới cư dân!");
    } catch (err) {
      notify(`Lỗi phát hành: ${(err as Error).message}`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Hóa đơn & Kỳ thu phí"
        subtitle="Quản lý kỳ thu, tính toán tiền điện/nước/phí tự động và theo dõi công nợ."
        onBack={onBack}
        backLabel="Tổng quan"
        action={
          canManage && tab === "periods" ? (
            <button className="button button-primary" onClick={() => setOpenCreatePeriod(!openCreatePeriod)}>
              <Icon name="plus" /> Mở kỳ thu phí mới
            </button>
          ) : undefined
        }
      />

      <div className="toolbar-row">
        <div className="segmented">
          <button className={tab === "invoices" ? "segment-active" : ""} onClick={() => setTab("invoices")}>
            Danh sách hóa đơn ({invoices.data?.length ?? 0})
          </button>
          <button className={tab === "periods" ? "segment-active" : ""} onClick={() => setTab("periods")}>
            Kỳ thu phí & Lập hóa đơn tự động ({periods.data?.length ?? 0})
          </button>
        </div>
      </div>

      {tab === "periods" && (
        <>
          {openCreatePeriod && (
            <form className="surface inline-form" onSubmit={createPeriod}>
              <h2>Tạo kỳ thu phí mới</h2>
              <label>
                Tòa nhà
                <select name="buildingId" required>
                  <option value="">Chọn tòa nhà</option>
                  {(buildings.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Từ ngày
                  <input
                    type="date"
                    name="periodStart"
                    required
                    defaultValue={new Date().toISOString().slice(0, 7) + "-01"}
                  />
                </label>
                <label>
                  Đến ngày
                  <input
                    type="date"
                    name="periodEnd"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>
              </div>
              <label>
                Hạn thanh toán
                <input
                  type="date"
                  name="dueDate"
                  required
                  defaultValue={new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)}
                />
              </label>
              {periodError && <ErrorBanner message={periodError} />}
              <button className="button button-primary">Tạo kỳ thu phí</button>
            </form>
          )}

          <section className="surface table-surface">
            <div className="table-header">
              <h2>Danh sách kỳ thu phí</h2>
              <button className="button button-quiet" onClick={periods.reload}>
                Làm mới
              </button>
            </div>
            {periods.loading ? (
              <LoadingLine />
            ) : periods.error ? (
              <ErrorBanner message={periods.error} />
            ) : periods.data?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tòa nhà</th>
                      <th>Kỳ phí</th>
                      <th>Hạn thanh toán</th>
                      <th>Số hóa đơn</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      {canManage && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.data.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong className="table-primary">{p.building_name}</strong>
                        </td>
                        <td>
                          {date(p.period_start)} – {date(p.period_end)}
                        </td>
                        <td>{date(p.due_date)}</td>
                        <td>{p.invoice_count} hóa đơn</td>
                        <td>
                          <strong>{money(p.total_amount)}</strong>
                        </td>
                        <td>
                          <StatusTag value={p.status} />
                        </td>
                        {canManage && (
                          <td style={{ display: "flex", gap: "6px" }}>
                            {p.status === "DRAFT" && (
                              <button
                                className="button button-primary"
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                                disabled={busyAction === `gen-${p.id}`}
                                onClick={() => generateInvoices(p.id)}
                              >
                                {busyAction === `gen-${p.id}` ? "Đang tính..." : "Sinh hóa đơn tự động"}
                              </button>
                            )}
                            {p.status === "GENERATED" && (
                              <>
                                <button
                                  className="button button-primary"
                                  style={{ fontSize: "11px", padding: "4px 8px" }}
                                  disabled={busyAction === `issue-${p.id}`}
                                  onClick={() => issuePeriod(p.id)}
                                >
                                  {busyAction === `issue-${p.id}` ? "Đang phát hành..." : "Phát hành hóa đơn"}
                                </button>
                                <button
                                  className="button button-quiet"
                                  style={{ fontSize: "11px", padding: "4px 8px" }}
                                  disabled={busyAction === `gen-${p.id}`}
                                  onClick={() => generateInvoices(p.id)}
                                >
                                  Tính lại
                                </button>
                              </>
                            )}
                            {p.status === "ISSUED" && (
                              <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                                ✓ Đã phát hành
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Chưa có kỳ thu phí"
                text="Tạo kỳ thu mới để hệ thống tự động quét diện tích căn hộ, số điện nước và sinh hóa đơn."
              />
            )}
          </section>
        </>
      )}

      {tab === "invoices" && (
        <section className="surface table-surface">
          <div className="table-header">
            <h2>Hóa đơn căn hộ</h2>
            <button className="button button-quiet" onClick={invoices.reload}>
              Làm mới
            </button>
          </div>
          {invoices.loading ? (
            <LoadingLine />
          ) : invoices.error ? (
            <ErrorBanner message={invoices.error} />
          ) : invoices.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Căn hộ</th>
                    <th>Hạn thanh toán</th>
                    <th>Tổng tiền</th>
                    <th>Đã trả</th>
                    <th>Còn lại</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.data.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong className="table-primary">{invoice.invoice_number}</strong>
                      </td>
                      <td>{invoice.apartment_code}</td>
                      <td>{date(invoice.due_date)}</td>
                      <td>{money(invoice.total_amount)}</td>
                      <td>{money(invoice.paid_amount)}</td>
                      <td>
                        <strong style={{ color: Number(invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>
                          {money(invoice.balance_due)}
                        </strong>
                      </td>
                      <td>
                        <StatusTag value={invoice.status} />
                      </td>
                      <td style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="button button-quiet"
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                          onClick={() => setSelectedInvoiceForDetail(invoice.id)}
                        >
                          Chi tiết
                        </button>
                        {Number(invoice.balance_due) > 0 && invoice.status !== "DRAFT" && (
                          <button
                            className="button button-quiet"
                            style={{ fontSize: "11px", padding: "4px 8px", color: "#0284c7", fontWeight: 600 }}
                            onClick={() => setSelectedInvoiceForSepay(invoice)}
                          >
                            QR SePay
                          </button>
                        )}
                        {canManage && Number(invoice.balance_due) > 0 && invoice.status !== "DRAFT" && (
                          <button
                            className="button button-primary"
                            style={{ fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => setSelectedInvoiceForPay(invoice)}
                          >
                            Thu tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Chưa có hóa đơn"
              text="Hóa đơn xuất hiện sau khi tạo kỳ thu và ấn Sinh hóa đơn tự động."
            />
          )}
        </section>
      )}

      {selectedInvoiceForDetail && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceForDetail}
          onClose={() => setSelectedInvoiceForDetail(null)}
        />
      )}

      {selectedInvoiceForPay && (
        <PaymentModal
          invoice={selectedInvoiceForPay}
          onClose={() => setSelectedInvoiceForPay(null)}
          onSuccess={() => {
            setSelectedInvoiceForPay(null);
            invoices.reload();
            notify("Đã ghi nhận thanh toán thành công!");
          }}
        />
      )}

      {selectedInvoiceForSepay && (
        <SepayModal
          invoice={selectedInvoiceForSepay}
          onClose={() => setSelectedInvoiceForSepay(null)}
          onSuccess={() => {
            setSelectedInvoiceForSepay(null);
            invoices.reload();
            notify(`Hóa đơn ${selectedInvoiceForSepay.invoice_number} đã được thanh toán thành công qua SePay!`);
          }}
        />
      )}
    </>
  );
}
