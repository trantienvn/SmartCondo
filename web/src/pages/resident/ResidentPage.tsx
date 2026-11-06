import { ResidentDashboard } from "./ResidentDashboard";
import { ResidentFeeTypes } from "./ResidentFeeTypes";
import { ResidentInvoices } from "./ResidentInvoices";
import { ResidentMaintenance } from "./ResidentMaintenance";
import { ResidentNotices } from "./ResidentNotices";
import { ResidentUtilityReadings } from "./ResidentUtilityReadings";

export function ResidentPage({
  page,
  setPage,
  notify,
}: {
  page: string;
  setPage: (page: any) => void;
  notify: (message: string) => void;
}) {
  const goHome = () => setPage("overview");

  if (page === "invoices") return <ResidentInvoices onBack={goHome} />;
  if (page === "maintenance") return <ResidentMaintenance notify={notify} onBack={goHome} />;
  if (page === "notices") return <ResidentNotices notify={notify} onBack={goHome} />;
  if (page === "utility-readings") return <ResidentUtilityReadings onBack={goHome} />;
  if (page === "fee-types") return <ResidentFeeTypes onBack={goHome} />;
  return <ResidentDashboard setPage={setPage} />;
}
