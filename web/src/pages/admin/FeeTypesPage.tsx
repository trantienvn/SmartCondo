import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Building, FeeType } from "../../types";
import { money } from "../../utils/format";

export function FeeTypesPage({
  canManage,
  notify,
}: {
  canManage: boolean;
  notify: (message: string) => void;
}) {
  const feeTypes = useRemote<FeeType[]>("/fee-types", "feeTypes");
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const methodLabels: Record<string, { label: string; unit: string }> = {
    PER_SQM: { label: "Theo diện tích căn hộ", unit: "₫ / m² / tháng" },
    ELECTRICITY: { label: "Điện sinh hoạt", unit: "₫ / kWh" },
    WATER: { label: "Nước sinh hoạt", unit: "₫ / m³" },
    FIXED: { label: "Cố định mỗi căn hộ", unit: "₫ / căn / tháng" },
    MANUAL: { label: "Nhập tay từng kỳ", unit: "₫" },
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/fee-types", {
        method: "POST",
        body: JSON.stringify({
          buildingId: form.get("buildingId"),
          code: form.get("code"),
          name: form.get("name"),
          calculationMethod: form.get("calculationMethod"),
          unitPrice: form.get("unitPrice"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      feeTypes.reload();
      notify("Đã lưu biểu phí thành công.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Biểu phí dịch vụ & Đơn giá"
        subtitle="Cấu hình đơn giá phí quản lý, đơn giá điện, nước và dịch vụ áp dụng tự động cho hóa đơn."
        action={
          canManage ? (
            <button className="button button-primary" onClick={() => setOpen(!open)}>
              <Icon name="plus" /> Thêm biểu phí
            </button>
          ) : undefined
        }
      />
      {open && (
        <form className="surface inline-form" onSubmit={submit}>
          <h2>Thêm loại phí mới</h2>
          <label>
            Tòa nhà *
            <select name="buildingId" required>
              <option value="">Chọn tòa nhà</option>
              {(buildings.data ?? []).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mã loại phí *
            <input name="code" required placeholder="VD: DIEN-SH, NUOC-SH, QL-SQM" />
          </label>
          <label>
            Tên biểu phí *
            <input name="name" required placeholder="VD: Tiền điện sinh hoạt" />
          </label>
          <label>
            Phương pháp tính *
            <select name="calculationMethod">
              <option value="PER_SQM">Theo diện tích (m²)</option>
              <option value="ELECTRICITY">Chỉ số điện (kWh)</option>
              <option value="WATER">Chỉ số nước (m³)</option>
              <option value="FIXED">Cố định hàng tháng</option>
            </select>
          </label>
          <label>
            Đơn giá (VNĐ) *
            <input type="number" name="unitPrice" required min="0" placeholder="VD: 3000" />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu biểu phí</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>Danh sách biểu phí áp dụng</h2>
          <button className="button button-quiet" onClick={feeTypes.reload}>
            Làm mới
          </button>
        </div>
        {feeTypes.loading ? (
          <LoadingLine />
        ) : feeTypes.error ? (
          <ErrorBanner message={feeTypes.error} />
        ) : feeTypes.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mã phí</th>
                  <th>Tên phí</th>
                  <th>Phương pháp tính</th>
                  <th>Đơn giá</th>
                  <th>Đơn vị tính</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {feeTypes.data.map((item) => {
                  const meta = methodLabels[item.calculation_method] ?? {
                    label: item.calculation_method,
                    unit: "₫",
                  };
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong className="table-primary">{item.code}</strong>
                      </td>
                      <td>{item.name}</td>
                      <td>{meta.label}</td>
                      <td>
                        <strong>{money(item.unit_price)}</strong>
                      </td>
                      <td>
                        <small style={{ color: "#64748b" }}>{meta.unit}</small>
                      </td>
                      <td>
                        <span
                          style={{
                            color: item.active ? "#15803d" : "#64748b",
                            fontWeight: 600,
                            fontSize: "11px",
                          }}
                        >
                          {item.active ? "● Đang áp dụng" : "○ Tạm dừng"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có biểu phí"
            text="Cấu hình biểu phí để hệ thống tự động tính thành tiền trong kỳ thu."
          />
        )}
      </section>
    </>
  );
}
