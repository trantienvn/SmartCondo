import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, NoticeItem, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import type { Notice } from "../../types";

export function ResidentNotices({
  notify,
  onBack,
}: {
  notify: (message: string) => void;
  onBack?: () => void;
}) {
  const notices = useRemote<Notice[]>("/notifications", "notifications");
  return (
    <>
      <PageHeading
        title="Thông báo"
        subtitle="Thông tin mới từ Ban quản lý tòa nhà."
        onBack={onBack}
        backLabel="Trang chủ"
      />
      {notices.loading ? (
        <LoadingLine />
      ) : notices.error ? (
        <ErrorBanner message={notices.error} />
      ) : notices.data?.length ? (
        <div className="notice-list">
          {notices.data.map((item) => (
            <NoticeItem
              key={item.id}
              notice={item}
              onRead={async () => {
                try {
                  await api(`/notifications/${item.id}/read`, { method: "POST" });
                  notices.reload();
                  notify("Đã đánh dấu đã đọc.");
                } catch (reason) {
                  notify((reason as Error).message);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="surface">
          <EmptyState title="Chưa có thông báo" text="Thông báo mới sẽ xuất hiện ở đây." />
        </div>
      )}
    </>
  );
}
