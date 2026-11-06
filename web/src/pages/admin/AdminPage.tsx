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
  setPage,
  session,
  notify,
}: {
  page: AdminPageId;
  setPage: (page: AdminPageId) => void;
  session: Session;
  notify: (message: string) => void;
}) {
  const goOverview = () => setPage("overview");

  switch (page) {
    case "buildings":
      return (
        <BuildingsPage
          canCreate={
            session.permissions.includes("building:manage") &&
            session.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(scope.role))
          }
          notify={notify}
          onBack={goOverview}
        />
      );
    case "apartments":
      return (
        <ApartmentsPage
          canManage={session.permissions.includes("building:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "people":
      return (
        <PeoplePage
          canManage={session.permissions.includes("people:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "invoices":
      return (
        <InvoicesPage
          canManage={session.permissions.includes("billing:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "maintenance":
      return (
        <MaintenancePage
          canManage={session.permissions.includes("maintenance:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "notices":
      return (
        <NoticesPage
          canManage={session.permissions.includes("notification:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "utility-readings":
      return (
        <UtilityReadingsPage
          canManage={session.permissions.includes("utility:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    case "fee-types":
      return (
        <FeeTypesPage
          canManage={session.permissions.includes("billing:manage")}
          notify={notify}
          onBack={goOverview}
        />
      );
    default:
      return <AdminDashboard setPage={setPage} />;
  }
}
