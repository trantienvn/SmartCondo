import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, NoticeItem, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Building, Notice } from "../../types";

export function NoticesPage({
  canManage,
  notify,
  onBack,
}: {
  canManage: boolean;
  notify: (message: string) => void;
  onBack?: () => void;
}) {
  const notices = useRemote<Notice[]>("/notifications", "notifications");
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/notifications", {
        method: "POST",
        body: JSON.stringify({
          buildingId: form.get("buildingId"),
          title: form.get("title"),
          content: form.get("content"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      notices.reload();
      notify("Đã gửi thông báo đến cư dân.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Thông báo"
        subtitle="Thông tin được gửi đến chủ sở hữu và cư dân hiện tại."
        onBack={onBack}
        backLabel="Tổng quan"
        action={
          canManage && buildings.data?.length ? (
            <button className="button button-primary" onClick={() => setOpen(!open)}>
              <Icon name="plus" /> Tạo thông báo
            </button>
          ) : undefined
        }
      />
      {open && (
        <form className="surface inline-form notice-form" onSubmit={publish}>
          <h2>Thông báo mới</h2>
          <label>
            Tòa nhà
            <select name="buildingId" required>
              <option value="">Chọn tòa nhà</option>
              {(buildings.data ?? []).map((building) => (
                <option value={building.id} key={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tiêu đề
            <input name="title" required maxLength={200} />
          </label>
          <label>
            Nội dung
            <textarea name="content" rows={4} required />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Gửi thông báo</button>
        </form>
      )}
      {notices.loading ? (
        <LoadingLine />
      ) : notices.error ? (
        <ErrorBanner message={notices.error} />
      ) : notices.data?.length ? (
        <div className="notice-list">
          {notices.data.map((notice) => (
            <NoticeItem
              key={notice.id}
              notice={notice}
              onRead={async () => {
                await api(`/notifications/${notice.id}/read`, { method: "POST" });
                notices.reload();
                notify("Đã đánh dấu đã đọc.");
              }}
            />
          ))}
        </div>
      ) : (
        <div className="surface">
          <EmptyState title="Chưa có thông báo" text="Thông báo đã gửi sẽ được lưu ở đây." />
        </div>
      )}
    </>
  );
}
