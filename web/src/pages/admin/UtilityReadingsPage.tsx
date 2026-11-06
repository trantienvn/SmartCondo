import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Apartment, UtilityReading } from "../../types";
import { date } from "../../utils/format";

export function UtilityReadingsPage({
  canManage,
  notify,
}: {
  canManage: boolean;
  notify: (message: string) => void;
}) {
  const readings = useRemote<UtilityReading[]>("/utility-readings", "readings");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const [elecPrev, setElecPrev] = useState(0);
  const [elecCurr, setElecCurr] = useState(0);
  const [waterPrev, setWaterPrev] = useState(0);
  const [waterCurr, setWaterCurr] = useState(0);

  const elecUsage = Math.max(0, elecCurr - elecPrev);
  const waterUsage = Math.max(0, waterCurr - waterPrev);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/utility-readings", {
        method: "POST",
        body: JSON.stringify({
          apartmentId: form.get("apartmentId"),
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          electricPrevious: form.get("electricPrevious"),
          electricCurrent: form.get("electricCurrent"),
          waterPrevious: form.get("waterPrevious"),
          waterCurrent: form.get("waterCurrent"),
          note: form.get("note"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      readings.reload();
      notify("Đã lưu chỉ số điện nước thành công.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Chỉ số điện & nước"
        subtitle="Ghi nhận số công tơ định kỳ hàng tháng để làm cơ sở tự động tính hóa đơn."
        action={
          canManage ? (
            <button className="button button-primary" onClick={() => setOpen(!open)}>
              <Icon name="plus" /> Ghi chỉ số mới
            </button>
          ) : undefined
        }
      />
      {open && (
        <form className="surface inline-form" onSubmit={submit}>
          <h2>Ghi chỉ số điện nước tháng</h2>
          <label>
            Căn hộ *
            <select name="apartmentId" required>
              <option value="">Chọn căn hộ</option>
              {(apartments.data ?? []).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.building_name} · {item.code}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Từ ngày *
              <input
                type="date"
                name="periodStart"
                required
                defaultValue={new Date().toISOString().slice(0, 7) + "-01"}
              />
            </label>
            <label>
              Đến ngày *
              <input
                type="date"
                name="periodEnd"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Điện kỳ trước (kWh) *
              <input
                type="number"
                step="1"
                min="0"
                name="electricPrevious"
                required
                onChange={(e) => setElecPrev(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Điện kỳ này (kWh) *
              <input
                type="number"
                step="1"
                min="0"
                name="electricCurrent"
                required
                onChange={(e) => setElecCurr(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <div
            style={{
              background: "#f8fafc",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              gridColumn: "1/-1",
            }}
          >
            Tiêu thụ điện dự kiến: <strong style={{ color: "#d97706" }}>{elecUsage} kWh</strong>
          </div>
          <div className="form-row">
            <label>
              Nước kỳ trước (m³) *
              <input
                type="number"
                step="1"
                min="0"
                name="waterPrevious"
                required
                onChange={(e) => setWaterPrev(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Nước kỳ này (m³) *
              <input
                type="number"
                step="1"
                min="0"
                name="waterCurrent"
                required
                onChange={(e) => setWaterCurr(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <div
            style={{
              background: "#f8fafc",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              gridColumn: "1/-1",
            }}
          >
            Tiêu thụ nước dự kiến: <strong style={{ color: "#0284c7" }}>{waterUsage} m³</strong>
          </div>
          <label style={{ gridColumn: "1/-1" }}>
            Ghi chú
            <input name="note" placeholder="VD: Công tơ hoạt động bình thường" />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu chỉ số</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>Lịch sử chỉ số công tơ</h2>
          <button className="button button-quiet" onClick={readings.reload}>
            Làm mới
          </button>
        </div>
        {readings.loading ? (
          <LoadingLine />
        ) : readings.error ? (
          <ErrorBanner message={readings.error} />
        ) : readings.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Căn hộ</th>
                  <th>Kỳ chốt</th>
                  <th>Điện (Cũ → Mới)</th>
                  <th>Tiêu thụ Điện</th>
                  <th>Nước (Cũ → Mới)</th>
                  <th>Tiêu thụ Nước</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {readings.data.map((item) => {
                  const eUsage = Number(item.electric_current) - Number(item.electric_previous);
                  const wUsage = Number(item.water_current) - Number(item.water_previous);
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong className="table-primary">{item.apartment_code}</strong>
                      </td>
                      <td>
                        {date(item.period_start)} – {date(item.period_end)}
                      </td>
                      <td>
                        {item.electric_previous} → {item.electric_current}
                      </td>
                      <td>
                        <strong style={{ color: "#d97706" }}>{eUsage} kWh</strong>
                      </td>
                      <td>
                        {item.water_previous} → {item.water_current}
                      </td>
                      <td>
                        <strong style={{ color: "#0284c7" }}>{wUsage} m³</strong>
                      </td>
                      <td>
                        <small>{item.note || "—"}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có dữ liệu"
            text="Ghi nhận chỉ số điện nước hàng tháng để tự động xuất hóa đơn."
          />
        )}
      </section>
    </>
  );
}
