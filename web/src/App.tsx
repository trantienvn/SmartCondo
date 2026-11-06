import { useEffect, useState } from "react";
import { clearSession, hasSession, loadSession, logout } from "./api";
import { Icon } from "./icons";
import { AdminPage, type AdminPageId } from "./pages/admin";
import { Login } from "./pages/auth/Login";
import { ResidentPage } from "./pages/resident";
import type { Session } from "./types";
import { initials, roleLabel } from "./utils/format";

export type PageId = AdminPageId;

export const navItems: {
  id: PageId;
  label: string;
  icon: "home" | "building" | "apartment" | "people" | "invoice" | "wrench" | "bell" | "droplet" | "coins";
  permission?: string;
}[] = [
  { id: "overview", label: "Tổng quan", icon: "home", permission: "dashboard:read" },
  { id: "buildings", label: "Tòa nhà", icon: "building", permission: "building:read" },
  { id: "apartments", label: "Căn hộ", icon: "apartment", permission: "apartment:read" },
  { id: "people", label: "Chủ sở hữu và cư dân", icon: "people", permission: "people:read" },
  { id: "invoices", label: "Hóa đơn", icon: "invoice", permission: "billing:read" },
  { id: "maintenance", label: "Bảo trì", icon: "wrench", permission: "maintenance:read" },
  { id: "notices", label: "Thông báo", icon: "bell", permission: "notification:read" },
  { id: "utility-readings", label: "Chỉ số tiện ích", icon: "droplet", permission: "utility:read" },
  { id: "fee-types", label: "Biểu phí", icon: "coins", permission: "billing:manage" },
];

function getPageFromHash(session: Session): PageId | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return null;
  const residentOnly =
    session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role)) &&
    !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));
  const available = residentOnly
    ? navItems.filter((item) => ["overview", "invoices", "maintenance", "notices", "utility-readings", "fee-types"].includes(item.id))
    : navItems.filter((item) => !item.permission || session.permissions.includes(item.permission));
  const match = available.find((item) => item.id === hash);
  return match ? (match.id as PageId) : null;
}

function getInitialPage(session: Session): PageId {
  const fromHash = getPageFromHash(session);
  if (fromHash) return fromHash;
  const residentOnly =
    session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role)) &&
    !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));
  if (residentOnly) return "overview";
  const permitted = navItems.filter((item) => !item.permission || session.permissions.includes(item.permission));
  return permitted[0]?.id ?? "overview";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<PageId>(() => {
    const saved = loadSession();
    return saved ? getInitialPage(saved) : "overview";
  });
  const [toast, setToast] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Đồng bộ browser hash và popstate/hashchange cho Back/Forward button của trình duyệt
  useEffect(() => {
    if (!session) return;
    const handleHashChange = () => {
      const target = getPageFromHash(session);
      if (target) {
        setPage(target);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [session]);

  const navigateTo = (nextPage: PageId) => {
    setPage(nextPage);
    setMobileMenu(false);
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash.replace(/^#\/?/, "");
      if (currentHash !== nextPage) {
        window.location.hash = nextPage;
      }
    }
  };

  useEffect(() => {
    const expired = () => {
      clearSession();
      setSession(null);
    };
    window.addEventListener("smartcondo:session-expired", expired);
    return () => window.removeEventListener("smartcondo:session-expired", expired);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!session || !hasSession()) {
    return (
      <Login
        onLogin={(next) => {
          setSession(next);
          const initial = getInitialPage(next);
          setPage(initial);
          window.location.hash = initial;
        }}
      />
    );
  }

  const residentOnly =
    session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role)) &&
    !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));

  const availableNav = residentOnly
    ? navItems.filter((item) => ["overview", "invoices", "maintenance", "notices", "utility-readings", "fee-types"].includes(item.id))
    : navItems.filter((item) => !item.permission || session.permissions.includes(item.permission));

  const active = availableNav.find((item) => item.id === page) ?? availableNav[0];
  const currentPage = active?.id ?? "overview";
  const notify = (message: string) => setToast(message);

  async function leave() {
    try {
      await logout();
    } catch {
      clearSession();
    }
    setSession(null);
  }

  return (
    <div className={residentOnly ? "shell resident-shell" : "shell admin-shell"}>
      {!residentOnly && (
        <aside className={`rail ${mobileMenu ? "rail-open" : ""}`} aria-label="Điều hướng chính">
          <div
            className="brand-lockup brand-clickable"
            onClick={() => navigateTo("overview")}
            title="Về Trang tổng quan"
            role="button"
            tabIndex={0}
          >
            <span className="brand-mark">
              <Icon name="building" />
            </span>
            <span>
              smart<span className="brand-light">condo</span>
            </span>
          </div>
          <p className="rail-caption">Không gian làm việc</p>
          <nav>
            {availableNav.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${currentPage === item.id ? "is-active" : ""}`}
                onClick={() => navigateTo(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="rail-bottom">
            <div className="user-chip">
              <span className="avatar">{initials(session.user.fullName || session.user.email)}</span>
              <span className="user-copy">
                <strong>{session.user.fullName || session.user.email}</strong>
                <small>{roleLabel(session.scopes[0]?.role)}</small>
              </span>
            </div>
            <button className="icon-button logout-button" aria-label="Đăng xuất" onClick={leave}>
              <Icon name="logout" />
            </button>
          </div>
        </aside>
      )}

      <main className="main-column">
        <header className="topbar">
          <button
            className="icon-button menu-trigger"
            aria-label="Mở điều hướng"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Icon name="menu" />
          </button>
          {residentOnly ? (
            <div className="resident-top-group">
              <div
                className="resident-brand"
                onClick={() => navigateTo("overview")}
                title="Về Trang chủ"
                role="button"
                tabIndex={0}
              >
                <span className="brand-mark">
                  <Icon name="building" />
                </span>
                <strong>
                  smart<span className="brand-light">condo</span>
                </strong>
              </div>
              {currentPage !== "overview" && (
                <button
                  type="button"
                  className="button-back-ghost"
                  onClick={() => navigateTo("overview")}
                  title="Quay lại Trang chủ"
                >
                  <Icon name="arrowLeft" />
                  <span>Trang chủ</span>
                </button>
              )}
              <nav className="resident-desktop-nav" aria-label="Điều hướng nhanh">
                {availableNav.map((item) => (
                  <button
                    key={item.id}
                    className={`resident-nav-tab ${currentPage === item.id ? "is-active" : ""}`}
                    onClick={() => navigateTo(item.id)}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          ) : currentPage !== "overview" ? (
            <div className="crumb-wrap">
              <button
                type="button"
                className="crumb-back-btn"
                onClick={() => navigateTo("overview")}
                title="Quay lại Tổng quan"
              >
                <Icon name="arrowLeft" />
                <span>Tổng quan</span>
              </button>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">{active?.label}</span>
            </div>
          ) : (
            <div className="crumb">{active?.label}</div>
          )}
          <div className="topbar-right">
            <span className="system-status">
              <i /> Hệ thống hoạt động
            </span>
            <span className="top-divider" />
            <span className="top-user">{session.user.fullName || session.user.email}</span>
            {residentOnly && (
              <button className="icon-button" aria-label="Đăng xuất" onClick={leave}>
                <Icon name="logout" />
              </button>
            )}
          </div>
        </header>
        <div className="workspace">
          {residentOnly ? (
            <ResidentPage page={currentPage} setPage={navigateTo} notify={notify} />
          ) : (
            <AdminPage page={currentPage} setPage={navigateTo} session={session} notify={notify} />
          )}
        </div>
      </main>
      {residentOnly && (
        <nav className="mobile-bottom" aria-label="Điều hướng cư dân">
          {[
            { id: "overview" as PageId, label: "Trang chủ", icon: "home" as const },
            { id: "invoices" as PageId, label: "Hóa đơn", icon: "invoice" as const },
            { id: "maintenance" as PageId, label: "Bảo trì", icon: "wrench" as const },
            { id: "notices" as PageId, label: "Thông báo", icon: "bell" as const },
          ].map((item) => (
            <button
              key={item.id}
              className={currentPage === item.id ? "bottom-active" : ""}
              onClick={() => navigateTo(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" />
          </span>
          {toast}
          <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setToast("")}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}