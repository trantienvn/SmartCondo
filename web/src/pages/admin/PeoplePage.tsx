import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Apartment } from "../../types";

export function PeoplePage({
  canManage,
  notify,
}: {
  canManage: boolean;
  notify: (message: string) => void;
}) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [apartmentId, setApartmentId] = useState("");
  const [kind, setKind] = useState<"owners" | "residents">("owners");
  const people = useRemote<Record<string, unknown>[]>(
    apartmentId ? `/apartments/${apartmentId}/${kind}` : "",
    kind
  );
  const [openAdd, setOpenAdd] = useState(false);
  const [error, setError] = useState("");

  async function submitOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`/apartments/${apartmentId}/owners`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email") || null,
          phone: form.get("phone") || null,
          ownershipPercent: Number(form.get("ownershipPercent") || 100),
          validFrom: form.get("validFrom"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenAdd(false);
      people.reload();
      notify("Đã thêm chủ sở hữu thành công.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitResident(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`/apartments/${apartmentId}/residents`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email") || null,
          phone: form.get("phone") || null,
          relationship: form.get("relationship"),
          canViewBills: form.get("canViewBills") === "on",
          canPayBills: form.get("canPayBills") === "on",
          validFrom: form.get("validFrom"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenAdd(false);
      people.reload();
      notify("Đã đăng ký cư dân thành công.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function endRelation(id: string) {
    if (!confirm("Bạn có chắc chắn muốn kết thúc quan hệ cư trú/sở hữu này?")) return;
    try {
      await api(`/apartments/${apartmentId}/${kind}/${id}/end`, { method: "POST" });
      people.reload();
      notify("Đã kết thúc hiệu lực thành công.");
    } catch (err) {
      notify(`Lỗi: ${(err as Error).message}`);
    }
  }

  return (
    <>
      <PageHeading
        title="Chủ sở hữu & Cư dân"
        subtitle="Quản lý hồ sơ cư trú, tỷ lệ sở hữu và phân quyền thanh toán hóa đơn."
        action={
          canManage && apartmentId ? (
            <button className="button button-primary" onClick={() => setOpenAdd(!openAdd)}>
              <Icon name="plus" /> {kind === "owners" ? "Thêm chủ sở hữu" : "Đăng ký cư dân"}
            </button>
          ) : undefined
        }
      />

      <div className="toolbar-row">
        <label className="select-label">
          Căn hộ
          <select value={apartmentId} onChange={(event) => setApartmentId(event.target.value)}>
            <option value="">Chọn căn hộ</option>
            {(apartments.data ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.building_name} · {unit.code}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented">
          <button
            className={kind === "owners" ? "segment-active" : ""}
            onClick={() => setKind("owners")}
          >
            Chủ sở hữu
          </button>
          <button
            className={kind === "residents" ? "segment-active" : ""}
            onClick={() => setKind("residents")}
          >
            Cư dân
          </button>
        </div>
      </div>

      {openAdd && apartmentId && kind === "owners" && (
        <form className="surface inline-form" onSubmit={submitOwner}>
          <h2>Thêm chủ sở hữu cho căn hộ</h2>
          <label>
            Họ và tên *
            <input name="fullName" required placeholder="Nguyễn Văn A" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="owner@example.com" />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="0901234567" />
          </label>
          <label>
            Tỷ lệ sở hữu (%) *
            <input
              type="number"
              name="ownershipPercent"
              required
              min="1"
              max="100"
              defaultValue="100"
            />
          </label>
          <label>
            Ngày bắt đầu hiệu lực *
            <input
              type="date"
              name="validFrom"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu chủ sở hữu</button>
        </form>
      )}

      {openAdd && apartmentId && kind === "residents" && (
        <form className="surface inline-form" onSubmit={submitResident}>
          <h2>Đăng ký cư dân cư trú</h2>
          <label>
            Họ và tên *
            <input name="fullName" required placeholder="Trần Thị B" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="resident@example.com" />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="0912345678" />
          </label>
          <label>
            Quan hệ với chủ hộ *
            <select name="relationship" defaultValue="TENANT">
              <option value="OWNER">Bản thân chủ sở hữu</option>
              <option value="FAMILY">Người trong gia đình</option>
              <option value="TENANT">Khách thuê nhà</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label>
            Ngày bắt đầu cư trú *
            <input
              type="date"
              name="validFrom"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "center",
              gridColumn: "1/-1",
              padding: "8px 0",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" name="canViewBills" defaultChecked />
              <span>Cho phép xem hóa đơn</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" name="canPayBills" defaultChecked />
              <span>Cho phép nộp tiền hóa đơn</span>
            </label>
          </div>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu cư dân</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>{kind === "owners" ? "Lịch sử & Danh sách sở hữu" : "Danh sách cư trú hiện tại"}</h2>
          <span>{people.data?.length ?? 0} hồ sơ</span>
        </div>
        {!apartmentId ? (
          <EmptyState
            title="Chọn một căn hộ"
            text="Thông tin chủ sở hữu và cư dân được giới hạn theo từng căn hộ."
          />
        ) : people.loading ? (
          <LoadingLine />
        ) : people.error ? (
          <ErrorBanner message={people.error} />
        ) : people.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>{kind === "owners" ? "Tỷ lệ sở hữu" : "Quan hệ / Quyền"}</th>
                  <th>Hiệu lực</th>
                  {canManage && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {people.data.map((person, index) => (
                  <tr key={String(person.id ?? index)}>
                    <td>
                      <strong className="table-primary">{String(person.full_name ?? "—")}</strong>
                    </td>
                    <td>{String(person.email ?? "—")}</td>
                    <td>{String(person.phone ?? "—")}</td>
                    <td>
                      {kind === "owners" ? (
                        <span style={{ fontWeight: 600 }}>
                          {String(person.ownership_percent ?? "100")}% sở hữu
                        </span>
                      ) : (
                        <div>
                          <strong>{String(person.relationship ?? "TENANT")}</strong>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            {person.can_view_bills ? "✓ Xem bill" : "✗ Không xem bill"} ·{" "}
                            {person.can_pay_bills ? "✓ Trả tiền" : "✗ Không trả tiền"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      {String(person.valid_from ?? "—")}{" "}
                      {person.valid_to ? `đến ${String(person.valid_to)}` : "· Hiện tại"}
                    </td>
                    {canManage && (
                      <td>
                        {!person.valid_to && (
                          <button
                            className="button button-quiet"
                            style={{ fontSize: "11px", padding: "4px 8px", color: "#b91c1c" }}
                            onClick={() => endRelation(String(person.id))}
                          >
                            Kết thúc
                          </button>
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
            title="Chưa có hồ sơ liên kết"
            text="Chưa ghi nhận chủ sở hữu hoặc cư dân cho căn hộ này. Bấm Thêm để tạo mới."
          />
        )}
      </section>
    </>
  );
}
