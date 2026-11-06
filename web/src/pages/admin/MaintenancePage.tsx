import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import type { MaintenanceRequest } from "../../types";
import { date } from "../../utils/format";

export function MaintenancePage({
  canManage,
  notify,
  onBack,
}: {
  canManage: boolean;
  notify: (message: string) => void;
  onBack?: () => void;
}) {
  const items = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");

  async function updateStatus(item: MaintenanceRequest, status: string) {
    try {
      await api(`/maintenance-requests/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      items.reload();
      notify("Đã cập nhật yêu cầu bảo trì.");
    } catch (reason) {
      notify((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Yêu cầu bảo trì"
        subtitle="Theo dõi tiến độ và mức độ ưu tiên của từng yêu cầu."
        onBack={onBack}
        backLabel="Tổng quan"
      />
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Danh sách yêu cầu</h2>
          <button className="button button-quiet" onClick={items.reload}>
            Làm mới
          </button>
        </div>
        {items.loading ? (
          <LoadingLine />
        ) : items.error ? (
          <ErrorBanner message={items.error} />
        ) : items.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Yêu cầu</th>
                  <th>Căn hộ</th>
                  <th>Ưu tiên</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                  {canManage && <th>Cập nhật</th>}
                </tr>
              </thead>
              <tbody>
                {items.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="table-primary">{item.title}</strong>
                      <small className="table-subline">{item.description}</small>
                    </td>
                    <td>{item.apartment_code}</td>
                    <td>
                      <StatusTag value={item.priority} />
                    </td>
                    <td>{date(item.created_at)}</td>
                    <td>
                      <StatusTag value={item.status} />
                    </td>
                    {canManage && (
                      <td>
                        <select
                          aria-label={`Cập nhật ${item.title}`}
                          value={item.status}
                          onChange={(event) => updateStatus(item, event.target.value)}
                        >
                          <option value="PENDING">Chờ xử lý</option>
                          <option value="IN_PROGRESS">Đang xử lý</option>
                          <option value="COMPLETED">Hoàn thành</option>
                          <option value="CANCELLED">Đã hủy</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Không có yêu cầu cần xử lý" text="Yêu cầu bảo trì mới sẽ xuất hiện tại đây." />
        )}
      </section>
    </>
  );
}
