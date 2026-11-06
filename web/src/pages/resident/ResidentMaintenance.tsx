import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Apartment, MaintenanceRequest } from "../../types";
import { date } from "../../utils/format";

export function ResidentMaintenance({
  notify,
  onBack,
}: {
  notify: (message: string) => void;
  onBack?: () => void;
}) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const requests = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/maintenance-requests", {
        method: "POST",
        body: JSON.stringify({
          apartmentId: form.get("apartmentId"),
          title: form.get("title"),
          description: form.get("description"),
          priority: form.get("priority"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      requests.reload();
      notify("Đã gửi yêu cầu bảo trì.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Yêu cầu bảo trì"
        subtitle="Theo dõi yêu cầu hiện tại hoặc báo một vấn đề mới."
        onBack={onBack}
        backLabel="Trang chủ"
        action={
          <button className="button button-primary" onClick={() => setOpen(!open)}>
            <Icon name="plus" /> Gửi yêu cầu
          </button>
        }
      />
      {open && (
        <form className="surface inline-form request-form" onSubmit={submit}>
          <h2>Yêu cầu mới</h2>
          <label>
            Căn hộ
            <select name="apartmentId" required>
              <option value="">Chọn căn hộ</option>
              {(apartments.data ?? []).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.building_name} · {item.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tiêu đề
            <input name="title" maxLength={200} required placeholder="Ví dụ: Đèn hành lang không sáng" />
          </label>
          <label>
            Mô tả
            <textarea
              name="description"
              rows={4}
              required
              placeholder="Mô tả vị trí và tình trạng bạn gặp."
            />
          </label>
          <label>
            Mức độ ưu tiên
            <select name="priority">
              <option value="MEDIUM">Thông thường</option>
              <option value="HIGH">Cao</option>
              <option value="LOW">Thấp</option>
            </select>
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Gửi yêu cầu</button>
        </form>
      )}
      {requests.loading ? (
        <LoadingLine />
      ) : requests.error ? (
        <ErrorBanner message={requests.error} />
      ) : requests.data?.length ? (
        <div className="request-list">
          {requests.data.map((item) => (
            <article className="surface request-item" key={item.id}>
              <div className="request-mark">
                <Icon name="wrench" />
              </div>
              <div className="request-copy">
                <strong>{item.title}</strong>
                <small>
                  {item.apartment_code} · {date(item.created_at)}
                </small>
                <p>{item.description}</p>
              </div>
              <StatusTag value={item.status} />
            </article>
          ))}
        </div>
      ) : (
        <div className="surface">
          <EmptyState
            title="Chưa có yêu cầu bảo trì"
            text="Nếu có vấn đề với căn hộ, hãy gửi yêu cầu để Ban quản lý tiếp nhận."
          />
        </div>
      )}
    </>
  );
}
