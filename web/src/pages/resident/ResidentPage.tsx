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
  if (page === "invoices") return <ResidentInvoices />;
  if (page === "maintenance") return <ResidentMaintenance notify={notify} />;
  if (page === "notices") return <ResidentNotices notify={notify} />;
  if (page === "utility-readings") return <ResidentUtilityReadings />;
  if (page === "fee-types") return <ResidentFeeTypes />;
  return <ResidentDashboard setPage={setPage} />;
}
