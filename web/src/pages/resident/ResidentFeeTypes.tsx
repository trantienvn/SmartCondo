import { ErrorBanner, EmptyState, LoadingLine, PageHeading } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import type { FeeType } from "../../types";
import { money } from "../../utils/format";

export function ResidentFeeTypes({ onBack }: { onBack?: () => void } = {}) {
  const feeTypes = useRemote<FeeType[]>("/fee-types", "feeTypes");
  const methodLabels: Record<string, string> = {
    PER_SQM: "Theo m² diện tích",
    ELECTRICITY: "Theo kWh điện tiêu thụ",
    WATER: "Theo m³ nước tiêu thụ",
    FIXED: "Cố định mỗi căn",
  };

  return (
    <>
      <PageHeading
        title="Biểu phí tòa nhà"
        subtitle="Danh mục các đơn giá dịch vụ đang được áp dụng tại chung cư."
        onBack={onBack}
        backLabel="Trang chủ"
      />
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Biểu phí công khai</h2>
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
                  <th>Mã</th>
                  <th>Tên khoản phí</th>
                  <th>Cách tính</th>
                  <th>Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {feeTypes.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="table-primary">{item.code}</strong>
                    </td>
                    <td>{item.name}</td>
                    <td>{methodLabels[item.calculation_method] ?? item.calculation_method}</td>
                    <td>
                      <strong>{money(item.unit_price)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có biểu phí"
            text="Biểu phí sẽ hiển thị khi Ban quản lý ban hành đơn giá."
          />
        )}
      </section>
    </>
  );
}
