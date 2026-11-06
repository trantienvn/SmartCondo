import type { Session } from "../../types";
import { AdminDashboard } from "./AdminDashboard";
import { ApartmentsPage } from "./ApartmentsPage";
import { BuildingsPage } from "./BuildingsPage";
import { FeeTypesPage } from "./FeeTypesPage";
import { InvoicesPage } from "./InvoicesPage";
import { MaintenancePage } from "./MaintenancePage";
import { NoticesPage } from "./NoticesPage";
import { PeoplePage } from "./PeoplePage";
import { UtilityReadingsPage } from "./UtilityReadingsPage";

export type AdminPageId =
  | "overview"
  | "buildings"
  | "apartments"
  | "people"
  | "invoices"
  | "maintenance"
  | "notices"
  | "utility-readings"
  | "fee-types";

export function AdminPage({
  page,
  session,
  notify,
}: {
  page: AdminPageId;
  session: Session;
  notify: (message: string) => void;
}) {
  switch (page) {
    case "buildings":
      return (
        <BuildingsPage
          canCreate={
            session.permissions.includes("building:manage") &&
            session.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(scope.role))
          }
          notify={notify}
        />
      );
    case "apartments":
      return <ApartmentsPage canManage={session.permissions.includes("building:manage")} notify={notify} />;
    case "people":
      return <PeoplePage canManage={session.permissions.includes("people:manage")} notify={notify} />;
    case "invoices":
      return <InvoicesPage canManage={session.permissions.includes("billing:manage")} notify={notify} />;
    case "maintenance":
      return <MaintenancePage canManage={session.permissions.includes("maintenance:manage")} notify={notify} />;
    case "notices":
      return <NoticesPage canManage={session.permissions.includes("notification:manage")} notify={notify} />;
    case "utility-readings":
      return (
        <UtilityReadingsPage canManage={session.permissions.includes("utility:manage")} notify={notify} />
      );
    case "fee-types":
      return <FeeTypesPage canManage={session.permissions.includes("billing:manage")} notify={notify} />;
    default:
      return <AdminDashboard />;
  }
}
