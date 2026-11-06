import { useMemo } from "react";
import { ErrorBanner, EmptyState, LoadingLine, Metric, PageHeading, StatusTag } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import { Icon } from "../../icons";
import type { Apartment, Building, DashboardSummary } from "../../types";
import { money, statusLabel } from "../../utils/format";

export function AdminDashboard() {
  const summary = useRemote<DashboardSummary>("/dashboard/summary");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const buildings = useRemote<Building[]>("/buildings", "buildings");

  const groups = useMemo(() => {
    const byBlock = new Map<string, Apartment[]>();
    for (const apartment of apartments.data ?? []) {
      byBlock.set(apartment.block_name, [...(byBlock.get(apartment.block_name) ?? []), apartment]);
    }
    return [...byBlock.entries()];
  }, [apartments.data]);

  return (
    <>
      <PageHeading
        title="Tổng quan vận hành"
        subtitle="Tình hình các tòa nhà trong phạm vi bạn quản lý."
        action={
          <button
            className="button button-quiet"
            onClick={() => {
              summary.reload();
              apartments.reload();
              buildings.reload();
            }}
          >
            Làm mới dữ liệu
          </button>
        }
      />
      {(summary.error || apartments.error || buildings.error) && (
        <ErrorBanner message={summary.error || apartments.error || buildings.error} />
      )}
      <section className="metric-grid" aria-label="Chỉ số vận hành">
        <Metric
          label="Căn hộ đang quản lý"
          value={summary.loading ? "—" : summary.data?.apartments.total ?? 0}
          detail={`${summary.data?.apartments.occupied ?? 0} căn đang có cư dân`}
          accent="cyan"
        />
        <Metric
          label="Yêu cầu cần xử lý"
          value={summary.loading ? "—" : summary.data?.maintenance.open ?? 0}
          detail="Đang chờ hoặc đang thực hiện"
          accent="amber"
        />
        <Metric
          label="Công nợ hiện tại"
          value={summary.loading ? "—" : money(summary.data?.invoices.outstanding)}
          detail="Từ các hóa đơn đã phát hành"
          accent="ink"
        />
      </section>
      <section className="dashboard-grid">
        <div className="surface floorplan-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tòa nhà</p>
              <h2>Mặt bằng căn hộ</h2>
            </div>
            <span className="section-count">{apartments.data?.length ?? 0} căn</span>
          </div>
          {apartments.loading ? (
            <LoadingLine />
          ) : groups.length ? (
            <div className="block-list">
              {groups.map(([block, units]) => (
                <div className="block-row" key={block}>
                  <div className="block-label">
                    <span className="block-glyph">{block.slice(0, 1).toUpperCase()}</span>
                    <strong>{block}</strong>
                    <small>{units.length} căn</small>
                  </div>
                  <div className="unit-grid">
                    {units.slice(0, 36).map((unit) => (
                      <div
                        key={unit.id}
                        className={`unit-cell unit-${unit.operational_status.toLowerCase()}`}
                        title={`${unit.code} · ${statusLabel(unit.operational_status)}`}
                      >
                        {unit.code}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có căn hộ" text="Thêm tòa nhà, khối và tầng để bắt đầu quản lý mặt bằng." />
          )}
          <div className="legend">
            <span>
              <i className="legend-dot dot-active" /> Đang hoạt động
            </span>
            <span>
              <i className="legend-dot dot-maintenance" /> Bảo trì
            </span>
            <span>
              <i className="legend-dot dot-inactive" /> Ngừng hoạt động
            </span>
          </div>
        </div>
        <div className="surface pulse-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Thu và chi</p>
              <h2>Tiêu thụ tiện ích</h2>
            </div>
            <span className="live-mark">
              <i /> Tháng này
            </span>
          </div>
          {summary.loading ? (
            <LoadingLine />
          ) : (
            <div className="utility-readings">
              <div className="utility-reading">
                <span className="utility-icon electric">E</span>
                <div>
                  <small>Điện đã ghi nhận</small>
                  <strong>
                    {Number(summary.data?.utilities.electricity_usage ?? 0).toLocaleString("vi-VN")}{" "}
                    <small>kWh</small>
                  </strong>
                </div>
              </div>
              <div className="utility-reading">
                <span className="utility-icon water">N</span>
                <div>
                  <small>Nước đã ghi nhận</small>
                  <strong>
                    {Number(summary.data?.utilities.water_usage ?? 0).toLocaleString("vi-VN")}{" "}
                    <small>m³</small>
                  </strong>
                </div>
              </div>
            </div>
          )}
          <div className="panel-footnote">Số liệu lấy từ chỉ số đã ghi trong hệ thống.</div>
        </div>
      </section>
      <section className="surface building-strip">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Phạm vi truy cập</p>
            <h2>Tòa nhà của bạn</h2>
          </div>
          <span className="section-count">{buildings.data?.length ?? 0} tòa nhà</span>
        </div>
        {buildings.loading ? (
          <LoadingLine />
        ) : buildings.data?.length ? (
          <div className="building-list">
            {buildings.data.map((building) => (
              <div className="building-item" key={building.id}>
                <span className="building-mini">
                  <Icon name="building" />
                </span>
                <div>
                  <strong>{building.name}</strong>
                  <small>{building.address || building.code}</small>
                </div>
                <StatusTag value={building.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có tòa nhà trong phạm vi"
            text="Tài khoản này chưa được gán phạm vi quản lý."
          />
        )}
      </section>
    </>
  );
}
