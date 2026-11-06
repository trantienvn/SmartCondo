import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Apartment, Invoice, MaintenanceRequest, Notice } from "../../types";
import { date, money } from "../../utils/format";

export function ResidentDashboard({ setPage }: { setPage: (page: string) => void }) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const maintenance = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");
  const notices = useRemote<Notice[]>("/notifications", "notifications");

  const balance = (invoices.data ?? []).reduce((sum, invoice) => sum + Number(invoice.balance_due), 0);
  const apartment = apartments.data?.[0];

  return (
    <>
      <PageHeading
        title={`Xin chào${apartment ? `, cư dân ${apartment.code}` : ""}`}
        subtitle="Thông tin căn hộ và dịch vụ của bạn."
      />
      {[apartments, invoices, maintenance, notices].some((item) => item.error) && (
        <ErrorBanner
          message={
            [apartments, invoices, maintenance, notices].find((item) => item.error)?.error ??
            "Không thể tải dữ liệu."
          }
        />
      )}
      <section className="resident-feature">
        <div>
          <p className="eyebrow">Căn hộ của bạn</p>
          <h2>{apartment?.code ?? "Chưa có căn hộ liên kết"}</h2>
          <p>
            {apartment
              ? `${apartment.building_name} · ${apartment.block_name} · Tầng ${apartment.floor_number}`
              : "Liên hệ Ban quản lý để kiểm tra hồ sơ cư trú."}
          </p>
        </div>
        <div className="resident-feature-aside">
          <span className="feature-sq">
            <Icon name="apartment" />
          </span>
          {apartment?.area_sqm && <small>{apartment.area_sqm} m²</small>}
        </div>
      </section>
      <section className="resident-metrics">
        <button className="resident-metric" onClick={() => setPage("invoices")}>
          <span className="resident-metric-icon icon-warm">
            <Icon name="invoice" />
          </span>
          <span>
            <small>Hóa đơn còn phải trả</small>
            <strong>{money(balance)}</strong>
            <em>{invoices.data?.filter((item) => Number(item.balance_due) > 0).length ?? 0} hóa đơn</em>
          </span>
          <Icon name="arrow" className="metric-arrow" />
        </button>
        <button className="resident-metric" onClick={() => setPage("maintenance")}>
          <span className="resident-metric-icon icon-cyan">
            <Icon name="wrench" />
          </span>
          <span>
            <small>Yêu cầu bảo trì</small>
            <strong>{maintenance.data?.length ?? 0}</strong>
            <em>Gửi và theo dõi yêu cầu</em>
          </span>
          <Icon name="arrow" className="metric-arrow" />
        </button>
        <button className="resident-metric" onClick={() => setPage("notices")}>
          <span className="resident-metric-icon icon-ink">
            <Icon name="bell" />
          </span>
          <span>
            <small>Thông báo chưa đọc</small>
            <strong>{notices.data?.filter((item) => !item.read_at).length ?? 0}</strong>
            <em>Thông tin từ Ban quản lý</em>
          </span>
          <Icon name="arrow" className="metric-arrow" />
        </button>
      </section>
      <section className="resident-lower">
        <div className="surface resident-next">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Việc cần lưu ý</p>
              <h2>Hóa đơn gần nhất</h2>
            </div>
            <button className="text-button" onClick={() => setPage("invoices")}>
              Xem hóa đơn
            </button>
          </div>
          {invoices.loading ? (
            <LoadingLine />
          ) : (() => {
              const due = invoices.data?.filter((item) => Number(item.balance_due) > 0).slice(0, 3) ?? [];
              return due.length ? (
                due.map((item) => (
                  <div className="next-row" key={item.id}>
                    <div>
                      <strong>{item.invoice_number}</strong>
                      <small>
                        Căn {item.apartment_code} · Hạn {date(item.due_date)}
                      </small>
                    </div>
                    <strong>{money(item.balance_due)}</strong>
                  </div>
                ))
              ) : (
                <EmptyState title="Bạn đã thanh toán" text="Hiện không có hóa đơn còn nợ." />
              );
            })()}
        </div>
        <div className="resident-help">
          <span className="help-mark">
            <Icon name="wrench" />
          </span>
          <p className="eyebrow">Cần hỗ trợ?</p>
          <h2>Gửi yêu cầu bảo trì</h2>
          <p>Mô tả vấn đề để Ban quản lý tiếp nhận và theo dõi.</p>
          <button className="button button-primary" onClick={() => setPage("maintenance")}>
            Tạo yêu cầu
          </button>
        </div>
      </section>
    </>
  );
}
