import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import type { UtilityReading } from "../../types";
import { date } from "../../utils/format";

export function ResidentUtilityReadings({ onBack }: { onBack?: () => void } = {}) {
  const readings = useRemote<UtilityReading[]>("/utility-readings", "readings");
  return (
    <>
      <PageHeading
        title="Lịch sử số điện & nước"
        subtitle="Theo dõi mức tiêu thụ điện nước thực tế của căn hộ qua các kỳ."
        onBack={onBack}
        backLabel="Trang chủ"
      />
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Chỉ số công tơ</h2>
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
                  <th>Kỳ ghi</th>
                  <th>Điện (Cũ → Mới)</th>
                  <th>Điện tiêu thụ</th>
                  <th>Nước (Cũ → Mới)</th>
                  <th>Nước tiêu thụ</th>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có dữ liệu chỉ số"
            text="Ban quản lý chưa cập nhật chỉ số điện nước cho căn hộ của bạn."
          />
        )}
      </section>
    </>
  );
}
