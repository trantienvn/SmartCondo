import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Building } from "../../types";

export function BuildingsPage({
  canCreate,
  notify,
}: {
  canCreate: boolean;
  notify: (message: string) => void;
}) {
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const organizations = useRemote<{ id: string; code: string; name: string }[]>(
    canCreate ? "/organizations" : "",
    "organizations"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/buildings", {
        method: "POST",
        body: JSON.stringify({
          organizationId: form.get("organizationId"),
          code: form.get("code"),
          name: form.get("name"),
          address: form.get("address"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setFormOpen(false);
      buildings.reload();
      notify("Đã tạo tòa nhà.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Tòa nhà"
        subtitle="Danh sách tòa nhà bạn được phân công."
        action={
          canCreate && (
            <button className="button button-primary" onClick={() => setFormOpen(!formOpen)}>
              <Icon name="plus" /> Thêm tòa nhà
            </button>
          )
        }
      />
      {formOpen && (
        <form className="surface inline-form building-form" onSubmit={create}>
          <div className="form-title">
            <h2>Tạo tòa nhà</h2>
            <p>Chọn tổ chức trong phạm vi được cấp.</p>
          </div>
          <label>
            Tổ chức
            <select name="organizationId" required>
              <option value="">Chọn tổ chức</option>
              {(organizations.data ?? []).map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} · {organization.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mã tòa nhà
            <input name="code" required placeholder="VD: TOWER-A" />
          </label>
          <label>
            Tên tòa nhà
            <input name="name" required placeholder="Tên hiển thị" />
          </label>
          <label>
            Địa chỉ
            <input name="address" placeholder="Địa chỉ" />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary" disabled={!organizations.data?.length}>
            Lưu tòa nhà
          </button>
        </form>
      )}
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Danh sách</h2>
          <span>{buildings.data?.length ?? 0} mục</span>
        </div>
        {buildings.loading ? (
          <LoadingLine />
        ) : buildings.error ? (
          <ErrorBanner message={buildings.error} />
        ) : buildings.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tòa nhà</th>
                  <th>Mã</th>
                  <th>Địa chỉ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {buildings.data.map((building) => (
                  <tr key={building.id}>
                    <td>
                      <strong className="table-primary">{building.name}</strong>
                    </td>
                    <td>{building.code}</td>
                    <td>{building.address || "—"}</td>
                    <td>
                      <StatusTag value={building.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có tòa nhà nào"
            text="Khi một tòa nhà được gán cho tài khoản, danh sách sẽ xuất hiện ở đây."
          />
        )}
      </section>
    </>
  );
}
