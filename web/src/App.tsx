import { useEffect, useMemo, useState } from "react";
import { api, clearSession, hasSession, loadSession, login, logout } from "./api";
import type { ApiResult, Apartment, BillingPeriod, Building, DashboardSummary, FeeType, Invoice, InvoiceDetail, MaintenanceRequest, Notice, Session, UtilityReading } from "./types";
import { Icon } from "./icons";

type PageId = "overview" | "buildings" | "apartments" | "people" | "invoices" | "maintenance" | "notices" | "utility-readings" | "fee-types";
type Remote<T> = { data: T | null; loading: boolean; error: string; reload: () => void };

function useRemote<T>(path: string, property?: string): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision((value) => value + 1);
  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError("");
    api<ApiResult<Record<string, unknown>>>(path)
      .then((result) => { if (active) setData((property ? result.data[property] : result.data) as T); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, property, revision]);
  return { data, loading, error, reload };
}

const navItems: { id: PageId; label: string; icon: "home" | "building" | "apartment" | "people" | "invoice" | "wrench" | "bell" | "droplet" | "coins"; permission?: string }[] = [
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

function getInitialPage(session: Session): PageId {
  const residentOnly = session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role))
    && !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));
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

  useEffect(() => {
    const expired = () => { clearSession(); setSession(null); };
    window.addEventListener("smartcondo:session-expired", expired);
    return () => window.removeEventListener("smartcondo:session-expired", expired);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!session || !hasSession()) return <Login onLogin={(next) => { setSession(next); setPage(getInitialPage(next)); }} />;

  const residentOnly = session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role))
    && !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));
  const availableNav = residentOnly
    ? navItems.filter((item) => ["overview", "invoices", "maintenance", "notices"].includes(item.id))
    : navItems.filter((item) => !item.permission || session.permissions.includes(item.permission));
  const active = availableNav.find((item) => item.id === page) ?? availableNav[0];
  const currentPage = active?.id ?? "overview";
  const notify = (message: string) => setToast(message);

  async function leave() {
    try { await logout(); } catch { clearSession(); }
    setSession(null);
  }

  return (
    <div className={residentOnly ? "shell resident-shell" : "shell admin-shell"}>
      {!residentOnly && <aside className={`rail ${mobileMenu ? "rail-open" : ""}`} aria-label="Điều hướng chính">
        <div className="brand-lockup"><span className="brand-mark"><Icon name="building" /></span><span>smart<span className="brand-light">condo</span></span></div>
        <p className="rail-caption">Không gian làm việc</p>
        <nav>{availableNav.map((item) => <button key={item.id} className={`nav-link ${currentPage === item.id ? "is-active" : ""}`} onClick={() => { setPage(item.id); setMobileMenu(false); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
        <div className="rail-bottom"><div className="user-chip"><span className="avatar">{initials(session.user.fullName || session.user.email)}</span><span className="user-copy"><strong>{session.user.fullName || session.user.email}</strong><small>{roleLabel(session.scopes[0]?.role)}</small></span></div><button className="icon-button logout-button" aria-label="Đăng xuất" onClick={leave}><Icon name="logout" /></button></div>
      </aside>}

      <main className="main-column">
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label="Mở điều hướng" onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu" /></button>
          {residentOnly ? <div className="resident-brand"><span className="brand-mark"><Icon name="building" /></span><strong>smart<span className="brand-light">condo</span></strong></div> : <div className="crumb">{active?.label}</div>}
          <div className="topbar-right"><span className="system-status"><i /> Hệ thống hoạt động</span><span className="top-divider" /><span className="top-user">{session.user.fullName || session.user.email}</span>{residentOnly && <button className="icon-button" aria-label="Đăng xuất" onClick={leave}><Icon name="logout" /></button>}</div>
        </header>
        <div className="workspace">
          {residentOnly
            ? <ResidentPage page={currentPage} setPage={setPage} notify={notify} />
            : <AdminPage page={currentPage} session={session} notify={notify} />}
        </div>
      </main>
      {residentOnly && <nav className="mobile-bottom" aria-label="Điều hướng cư dân">{[
        { id: "overview" as PageId, label: "Trang chủ", icon: "home" as const },
        { id: "invoices" as PageId, label: "Hóa đơn", icon: "invoice" as const },
        { id: "maintenance" as PageId, label: "Bảo trì", icon: "wrench" as const },
        { id: "notices" as PageId, label: "Thông báo", icon: "bell" as const },
      ].map((item) => <button key={item.id} className={currentPage === item.id ? "bottom-active" : ""} onClick={() => setPage(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>}
      {toast && <div className="toast" role="status"><span className="toast-check"><Icon name="check" /></span>{toast}<button className="icon-button" aria-label="Đóng thông báo" onClick={() => setToast("")}><Icon name="close" /></button></div>}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try { onLogin(await login(email.trim(), password)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  async function quickSeed() {
    setSeeding(true); setSeedMsg(""); setError("");
    try {
      await api("/demo/seed", { method: "POST" });
      setSeedMsg("Đã khởi tạo thành công dữ liệu mẫu! Bạn có thể chọn tài khoản bên dưới để đăng nhập ngay.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return <main className="login-page">
    <section className="login-story"><div className="brand-lockup light-brand"><span className="brand-mark"><Icon name="building" /></span><span>smart<span className="brand-light">condo</span></span></div>
      <div className="login-story-copy"><div className="building-line" aria-hidden="true"><span /><span /><span /><span /><span /></div><p className="login-kicker">Quản lý tòa nhà, gọn trong một nơi</p><h1>Vận hành rõ ràng.<br /><em>Cư dân an tâm.</em></h1><p className="login-intro">Thông tin căn hộ, phí dịch vụ và yêu cầu bảo trì được kết nối trong một không gian thống nhất.</p></div>
      <div className="login-footer"><span>SmartCondo</span><span>Quản lý chung cư thông minh</span></div>
    </section>
    <section className="login-panel"><form className="login-form" onSubmit={submit}>
      <p className="eyebrow">Chào mừng bạn</p><h2>Đăng nhập</h2><p className="login-hint">Dùng tài khoản được Ban quản lý cấp.</p>
      <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="ten@vidu.vn" /></label>
      <label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Nhập mật khẩu" /></label>
      {error && <div className="form-error" role="alert"><strong>Chưa thể đăng nhập</strong><span>{error}</span></div>}
      {seedMsg && <div className="form-error" style={{ background: "#e6fffa", borderColor: "#00b8d9", color: "#006677" }} role="status"><strong>Thông báo</strong><span>{seedMsg}</span></div>}
      <button className="button button-primary login-submit" disabled={loading}>{loading ? "Đang kiểm tra…" : "Đăng nhập"}<Icon name="arrow" /></button>
      
      <div className="demo-accounts">
        <p>⚡ Tài khoản Demo thử nghiệm nhanh:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <button type="button" className="button button-quiet" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => { setEmail("manager@smartcondo.vn"); setPassword("Manager@123"); }}>🏢 Ban Quản Lý</button>
          <button type="button" className="button button-quiet" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => { setEmail("accountant@smartcondo.vn"); setPassword("Accountant@123"); }}>💰 Kế toán</button>
          <button type="button" className="button button-quiet" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => { setEmail("resident@smartcondo.vn"); setPassword("Resident@123"); }}>👤 Cư dân A-101</button>
          <button type="button" className="button button-quiet" style={{ fontSize: "10px", padding: "4px 8px" }} onClick={() => { setEmail("admin@smartcondo.vn"); setPassword("Admin@123456"); }}>👑 Admin</button>
        </div>
        <button type="button" className="text-button" style={{ marginTop: "10px", fontSize: "10px", color: "var(--cyan)" }} disabled={seeding} onClick={quickSeed}>
          {seeding ? "Đang nạp dữ liệu..." : "🔄 Nhấn vào đây để nạp lại dữ liệu mẫu Demo (1-Click)"}
        </button>
      </div>

      <p className="login-support">Cần hỗ trợ? Liên hệ Ban quản lý tòa nhà.</p>
    </form></section>
  </main>;
}

function AdminPage({ page, session, notify }: { page: PageId; session: Session; notify: (message: string) => void }) {
  switch (page) {
    case "buildings": return <BuildingsPage canCreate={session.permissions.includes("building:manage") && session.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(scope.role))} notify={notify} />;
    case "apartments": return <ApartmentsPage canManage={session.permissions.includes("building:manage")} notify={notify} />;
    case "people": return <PeoplePage canManage={session.permissions.includes("people:manage")} notify={notify} />;
    case "invoices": return <InvoicesPage canManage={session.permissions.includes("billing:manage")} notify={notify} />;
    case "maintenance": return <MaintenancePage canManage={session.permissions.includes("maintenance:manage")} notify={notify} />;
    case "notices": return <NoticesPage canManage={session.permissions.includes("notification:manage")} notify={notify} />;
    case "utility-readings": return <UtilityReadingsPage canManage={session.permissions.includes("utility:manage")} notify={notify} />;
    case "fee-types": return <FeeTypesPage canManage={session.permissions.includes("billing:manage")} notify={notify} />;
    default: return <AdminDashboard />;
  }
}

function AdminDashboard() {
  const summary = useRemote<DashboardSummary>("/dashboard/summary");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const groups = useMemo(() => {
    const byBlock = new Map<string, Apartment[]>();
    for (const apartment of apartments.data ?? []) byBlock.set(apartment.block_name, [...(byBlock.get(apartment.block_name) ?? []), apartment]);
    return [...byBlock.entries()];
  }, [apartments.data]);
  return <>
    <PageHeading title="Tổng quan vận hành" subtitle="Tình hình các tòa nhà trong phạm vi bạn quản lý." action={<button className="button button-quiet" onClick={() => { summary.reload(); apartments.reload(); buildings.reload(); }}>Làm mới dữ liệu</button>} />
    {(summary.error || apartments.error || buildings.error) && <ErrorBanner message={summary.error || apartments.error || buildings.error} />}
    <section className="metric-grid" aria-label="Chỉ số vận hành">
      <Metric label="Căn hộ đang quản lý" value={summary.loading ? "—" : summary.data?.apartments.total ?? 0} detail={`${summary.data?.apartments.occupied ?? 0} căn đang có cư dân`} accent="cyan" />
      <Metric label="Yêu cầu cần xử lý" value={summary.loading ? "—" : summary.data?.maintenance.open ?? 0} detail="Đang chờ hoặc đang thực hiện" accent="amber" />
      <Metric label="Công nợ hiện tại" value={summary.loading ? "—" : money(summary.data?.invoices.outstanding)} detail="Từ các hóa đơn đã phát hành" accent="ink" />
    </section>
    <section className="dashboard-grid">
      <div className="surface floorplan-panel"><div className="section-heading"><div><p className="eyebrow">Tòa nhà</p><h2>Mặt bằng căn hộ</h2></div><span className="section-count">{apartments.data?.length ?? 0} căn</span></div>
        {apartments.loading ? <LoadingLine /> : groups.length ? <div className="block-list">{groups.map(([block, units]) => <div className="block-row" key={block}><div className="block-label"><span className="block-glyph">{block.slice(0, 1).toUpperCase()}</span><strong>{block}</strong><small>{units.length} căn</small></div><div className="unit-grid">{units.slice(0, 36).map((unit) => <div key={unit.id} className={`unit-cell unit-${unit.operational_status.toLowerCase()}`} title={`${unit.code} · ${statusLabel(unit.operational_status)}`}>{unit.code}</div>)}</div></div>)}</div> : <EmptyState title="Chưa có căn hộ" text="Thêm tòa nhà, khối và tầng để bắt đầu quản lý mặt bằng." />}
        <div className="legend"><span><i className="legend-dot dot-active" /> Đang hoạt động</span><span><i className="legend-dot dot-maintenance" /> Bảo trì</span><span><i className="legend-dot dot-inactive" /> Ngừng hoạt động</span></div>
      </div>
      <div className="surface pulse-panel"><div className="section-heading"><div><p className="eyebrow">Thu và chi</p><h2>Tiêu thụ tiện ích</h2></div><span className="live-mark"><i /> Tháng này</span></div>
        {summary.loading ? <LoadingLine /> : <div className="utility-readings"><div className="utility-reading"><span className="utility-icon electric">E</span><div><small>Điện đã ghi nhận</small><strong>{Number(summary.data?.utilities.electricity_usage ?? 0).toLocaleString("vi-VN")} <small>kWh</small></strong></div></div><div className="utility-reading"><span className="utility-icon water">N</span><div><small>Nước đã ghi nhận</small><strong>{Number(summary.data?.utilities.water_usage ?? 0).toLocaleString("vi-VN")} <small>m³</small></strong></div></div></div>}
        <div className="panel-footnote">Số liệu lấy từ chỉ số đã ghi trong hệ thống.</div>
      </div>
    </section>
    <section className="surface building-strip"><div className="section-heading"><div><p className="eyebrow">Phạm vi truy cập</p><h2>Tòa nhà của bạn</h2></div><span className="section-count">{buildings.data?.length ?? 0} tòa nhà</span></div>
      {buildings.loading ? <LoadingLine /> : buildings.data?.length ? <div className="building-list">{buildings.data.map((building) => <div className="building-item" key={building.id}><span className="building-mini"><Icon name="building" /></span><div><strong>{building.name}</strong><small>{building.address || building.code}</small></div><StatusTag value={building.status} /></div>)}</div> : <EmptyState title="Chưa có tòa nhà trong phạm vi" text="Tài khoản này chưa được gán phạm vi quản lý." />}
    </section>
  </>;
}

function BuildingsPage({ canCreate, notify }: { canCreate: boolean; notify: (message: string) => void }) {
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const organizations = useRemote<{ id: string; code: string; name: string }[]>(canCreate ? "/organizations" : "", "organizations");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/buildings", { method: "POST", body: JSON.stringify({ organizationId: form.get("organizationId"), code: form.get("code"), name: form.get("name"), address: form.get("address") }) });
      (event.currentTarget as HTMLFormElement).reset(); setFormOpen(false); buildings.reload(); notify("Đã tạo tòa nhà.");
    } catch (reason) { setError((reason as Error).message); }
  }
  return <><PageHeading title="Tòa nhà" subtitle="Danh sách tòa nhà bạn được phân công." action={canCreate && <button className="button button-primary" onClick={() => setFormOpen(!formOpen)}><Icon name="plus" /> Thêm tòa nhà</button>} />
    {formOpen && <form className="surface inline-form building-form" onSubmit={create}><div className="form-title"><h2>Tạo tòa nhà</h2><p>Chọn tổ chức trong phạm vi được cấp.</p></div><label>Tổ chức<select name="organizationId" required><option value="">Chọn tổ chức</option>{(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.code}</option>)}</select></label><label>Mã tòa nhà<input name="code" required placeholder="VD: TOWER-A" /></label><label>Tên tòa nhà<input name="name" required placeholder="Tên hiển thị" /></label><label>Địa chỉ<input name="address" placeholder="Địa chỉ" /></label>{error && <ErrorBanner message={error} />}<button className="button button-primary" disabled={!organizations.data?.length}>Lưu tòa nhà</button></form>}
    <section className="surface table-surface"><div className="table-header"><h2>Danh sách</h2><span>{buildings.data?.length ?? 0} mục</span></div>{buildings.loading ? <LoadingLine /> : buildings.error ? <ErrorBanner message={buildings.error} /> : buildings.data?.length ? <div className="table-scroll"><table><thead><tr><th>Tòa nhà</th><th>Mã</th><th>Địa chỉ</th><th>Trạng thái</th></tr></thead><tbody>{buildings.data.map((building) => <tr key={building.id}><td><strong className="table-primary">{building.name}</strong></td><td>{building.code}</td><td>{building.address || "—"}</td><td><StatusTag value={building.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có tòa nhà nào" text="Khi một tòa nhà được gán cho tài khoản, danh sách sẽ xuất hiện ở đây." />}</section>
  </>;
}

function ApartmentsPage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const blocks = useRemote<{ id: string; code: string; name: string; floors: { id: string; floorNumber: number; name: string | null }[] }[]>(selectedBuilding ? `/buildings/${selectedBuilding}/blocks` : "", "blocks");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [mode, setMode] = useState<"block" | "floor" | "apartment">("apartment");
  const [message, setMessage] = useState("");
  const selectedUnits = (apartments.data ?? []).filter((unit) => !selectedBuilding || unit.building_id === selectedBuilding);
  const flatFloors = (blocks.data ?? []).flatMap((block) => block.floors.map((floor) => ({ ...floor, block })));
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "block") await api(`/buildings/${selectedBuilding}/blocks`, { method: "POST", body: JSON.stringify({ code: form.get("code"), name: form.get("name") }) });
      if (mode === "floor") await api(`/blocks/${form.get("blockId")}/floors`, { method: "POST", body: JSON.stringify({ floorNumber: Number(form.get("floorNumber")), name: form.get("name") }) });
      if (mode === "apartment") await api("/apartments", { method: "POST", body: JSON.stringify({ floorId: form.get("floorId"), code: form.get("code"), areaSqm: form.get("areaSqm") || null, bedroomCount: form.get("bedroomCount") || null, bathroomCount: form.get("bathroomCount") || null }) });
      (event.currentTarget as HTMLFormElement).reset(); blocks.reload(); apartments.reload(); notify("Đã lưu cấu trúc căn hộ.");
    } catch (reason) { setMessage((reason as Error).message); }
  }
  return <><PageHeading title="Căn hộ" subtitle="Xem mặt bằng và thêm khối, tầng hoặc căn hộ." />
    <div className="toolbar-row"><label className="select-label">Tòa nhà<select value={selectedBuilding} onChange={(event) => setSelectedBuilding(event.target.value)}><option value="">Tất cả tòa nhà</option>{(buildings.data ?? []).map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>{canManage && <div className="segmented" role="group" aria-label="Loại cấu trúc cần thêm">{(["block", "floor", "apartment"] as const).map((item) => <button className={mode === item ? "segment-active" : ""} key={item} onClick={() => setMode(item)}>{item === "block" ? "Khối" : item === "floor" ? "Tầng" : "Căn hộ"}</button>)}</div>}</div>
    {canManage && <form className="surface inline-form structure-form" onSubmit={create}><div className="form-title"><span className="step-tag">Cấu trúc</span><h2>{mode === "block" ? "Thêm khối nhà" : mode === "floor" ? "Thêm tầng" : "Thêm căn hộ"}</h2></div>
      {mode === "block" && <><label>Tòa nhà<select required value={selectedBuilding} onChange={(event) => setSelectedBuilding(event.target.value)} name="building"><option value="">Chọn tòa nhà</option>{(buildings.data ?? []).map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label><label>Mã khối<input name="code" required placeholder="A" /></label><label>Tên khối<input name="name" required placeholder="Khối A" /></label></>}
      {mode === "floor" && <><label>Khối nhà<select required name="blockId"><option value="">Chọn khối</option>{(blocks.data ?? []).map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</select></label><label>Số tầng<input type="number" name="floorNumber" required /></label><label>Tên tầng<input name="name" placeholder="Không bắt buộc" /></label></>}
      {mode === "apartment" && <><label>Tầng<select required name="floorId"><option value="">Chọn tầng</option>{flatFloors.map((floor) => <option key={floor.id} value={floor.id}>{floor.block.name} · Tầng {floor.floorNumber}</option>)}</select></label><label>Mã căn hộ<input name="code" required placeholder="A-1201" /></label><label>Diện tích (m²)<input type="number" min="1" step="0.01" name="areaSqm" /></label><label>Phòng ngủ<input type="number" min="0" name="bedroomCount" /></label><label>Phòng tắm<input type="number" min="0" name="bathroomCount" /></label></>}
      {message && <ErrorBanner message={message} />}<button className="button button-primary" disabled={mode !== "block" && !flatFloors.length && mode !== "floor"}>Lưu cấu trúc</button>
    </form>}
    <section className="surface table-surface"><div className="table-header"><h2>Danh sách căn hộ</h2><span>{selectedUnits.length} căn</span></div>{apartments.loading ? <LoadingLine /> : apartments.error ? <ErrorBanner message={apartments.error} /> : selectedUnits.length ? <div className="table-scroll"><table><thead><tr><th>Căn hộ</th><th>Tòa nhà</th><th>Khối / tầng</th><th>Diện tích</th><th>Trạng thái</th></tr></thead><tbody>{selectedUnits.map((unit) => <tr key={unit.id}><td><strong className="table-primary">{unit.code}</strong></td><td>{unit.building_name}</td><td>{unit.block_name} / {unit.floor_number}</td><td>{unit.area_sqm ? `${unit.area_sqm} m²` : "—"}</td><td><StatusTag value={unit.operational_status} /></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có căn hộ" text="Tạo khối nhà và tầng trước, sau đó thêm căn hộ vào mặt bằng." />}</section>
  </>;
}

function InvoiceDetailModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const detail = useRemote<InvoiceDetail>(invoiceId ? `/invoices/${invoiceId}` : "");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Chi tiết hóa đơn {detail.data?.invoice.invoice_number ?? "..."}</h2>
            <small style={{ color: "#64748b" }}>Căn hộ: {detail.data?.invoice.apartment_code}</small>
          </div>
          <button type="button" className="button button-quiet" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="modal-body">
          {detail.loading ? (
            <LoadingLine />
          ) : detail.error ? (
            <ErrorBanner message={detail.error} />
          ) : detail.data ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
                <div><small style={{ color: "#64748b", display: "block" }}>Trạng thái</small><StatusTag value={detail.data.invoice.status} /></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Hạn nộp</small><strong>{date(detail.data.invoice.due_date)}</strong></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Tổng tiền</small><strong>{money(detail.data.invoice.total_amount)}</strong></div>
                <div><small style={{ color: "#64748b", display: "block" }}>Còn nợ</small><strong style={{ color: Number(detail.data.invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>{money(detail.data.invoice.balance_due)}</strong></div>
              </div>

              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, margin: "8px 0" }}>Bảng kê chi tiết các khoản phí</h3>
                {detail.data.items.length ? (
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Khoản phí</th>
                        <th style={{ textAlign: "right" }}>Số lượng / Tiêu thụ</th>
                        <th style={{ textAlign: "right" }}>Đơn giá</th>
                        <th style={{ textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.items.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.fee_name ?? item.description}</strong></td>
                          <td style={{ textAlign: "right" }}>{Number(item.quantity).toLocaleString("vi-VN")}</td>
                          <td style={{ textAlign: "right" }}>{money(item.unit_price)}</td>
                          <td style={{ textAlign: "right" }}><strong>{money(item.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#64748b", fontSize: "11px" }}>Chưa có chi tiết dòng phí.</p>
                )}
                <div className="breakdown-total">Tổng cộng: {money(detail.data.invoice.total_amount)}</div>
              </div>

              <div>
                <h3 style={{ fontSize: "13px", fontWeight: 600, margin: "8px 0" }}>Lịch sử thanh toán</h3>
                {detail.data.payments.length ? (
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Phương thức</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: "right" }}>Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{date(p.paid_at)}</td>
                          <td>{p.method === "CASH" ? "Tiền mặt" : p.method === "BANK_TRANSFER" ? "Chuyển khoản" : "Mô phỏng"}</td>
                          <td><StatusTag value={p.status} /></td>
                          <td style={{ textAlign: "right", color: "#15803d" }}><strong>{money(p.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#64748b", fontSize: "11px" }}>Chưa ghi nhận khoản thanh toán nào cho hóa đơn này.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("BANK_TRANSFER");
  const [amount, setAmount] = useState(invoice.balance_due);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const key = crypto.randomUUID();
      await api("/payments", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: String(amount),
          method,
          reference: reference || null,
          idempotencyKey: key,
        }),
      });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Ghi nhận thanh toán - Hóa đơn {invoice.invoice_number}</h2>
          <button type="button" className="button button-quiet" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "4px", fontSize: "12px" }}>
            Căn hộ: <strong>{invoice.apartment_code}</strong> · Còn phải thu: <strong style={{ color: "#b91c1c" }}>{money(invoice.balance_due)}</strong>
          </div>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Phương thức thanh toán
            <select value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "BANK_TRANSFER")}>
              <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
              <option value="CASH">Tiền mặt</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Số tiền thanh toán (₫)
            <input
              type="number"
              step="1"
              min="1000"
              max={invoice.balance_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
            Mã tham chiếu / Ghi chú (VD: Số GD ngân hàng)
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VD: FT26110892837"
            />
          </label>
          {error && <ErrorBanner message={error} />}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button-quiet" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? "Đang xử lý…" : "Xác nhận thu tiền"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PeoplePage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [apartmentId, setApartmentId] = useState("");
  const [kind, setKind] = useState<"owners" | "residents">("owners");
  const people = useRemote<Record<string, unknown>[]>(apartmentId ? `/apartments/${apartmentId}/${kind}` : "", kind);
  const [openAdd, setOpenAdd] = useState(false);
  const [error, setError] = useState("");

  async function submitOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`/apartments/${apartmentId}/owners`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email") || null,
          phone: form.get("phone") || null,
          ownershipPercent: Number(form.get("ownershipPercent") || 100),
          validFrom: form.get("validFrom"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenAdd(false);
      people.reload();
      notify("Đã thêm chủ sở hữu thành công.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitResident(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api(`/apartments/${apartmentId}/residents`, {
        method: "POST",
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email") || null,
          phone: form.get("phone") || null,
          relationship: form.get("relationship"),
          canViewBills: form.get("canViewBills") === "on",
          canPayBills: form.get("canPayBills") === "on",
          validFrom: form.get("validFrom"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenAdd(false);
      people.reload();
      notify("Đã đăng ký cư dân thành công.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function endRelation(id: string) {
    if (!confirm("Bạn có chắc chắn muốn kết thúc quan hệ cư trú/sở hữu này?")) return;
    try {
      await api(`/apartments/${apartmentId}/${kind}/${id}/end`, { method: "POST" });
      people.reload();
      notify("Đã kết thúc hiệu lực thành công.");
    } catch (err) {
      notify(`Lỗi: ${(err as Error).message}`);
    }
  }

  return (
    <>
      <PageHeading
        title="Chủ sở hữu & Cư dân"
        subtitle="Quản lý hồ sơ cư trú, tỷ lệ sở hữu và phân quyền thanh toán hóa đơn."
        action={
          canManage && apartmentId ? (
            <button className="button button-primary" onClick={() => setOpenAdd(!openAdd)}>
              <Icon name="plus" /> {kind === "owners" ? "Thêm chủ sở hữu" : "Đăng ký cư dân"}
            </button>
          ) : undefined
        }
      />

      <div className="toolbar-row">
        <label className="select-label">
          Căn hộ
          <select value={apartmentId} onChange={(event) => setApartmentId(event.target.value)}>
            <option value="">Chọn căn hộ</option>
            {(apartments.data ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.building_name} · {unit.code}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented">
          <button className={kind === "owners" ? "segment-active" : ""} onClick={() => setKind("owners")}>
            Chủ sở hữu
          </button>
          <button className={kind === "residents" ? "segment-active" : ""} onClick={() => setKind("residents")}>
            Cư dân
          </button>
        </div>
      </div>

      {openAdd && apartmentId && kind === "owners" && (
        <form className="surface inline-form" onSubmit={submitOwner}>
          <h2>Thêm chủ sở hữu cho căn hộ</h2>
          <label>
            Họ và tên *
            <input name="fullName" required placeholder="Nguyễn Văn A" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="owner@example.com" />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="0901234567" />
          </label>
          <label>
            Tỷ lệ sở hữu (%) *
            <input type="number" name="ownershipPercent" required min="1" max="100" defaultValue="100" />
          </label>
          <label>
            Ngày bắt đầu hiệu lực *
            <input type="date" name="validFrom" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu chủ sở hữu</button>
        </form>
      )}

      {openAdd && apartmentId && kind === "residents" && (
        <form className="surface inline-form" onSubmit={submitResident}>
          <h2>Đăng ký cư dân cư trú</h2>
          <label>
            Họ và tên *
            <input name="fullName" required placeholder="Trần Thị B" />
          </label>
          <label>
            Email
            <input type="email" name="email" placeholder="resident@example.com" />
          </label>
          <label>
            Số điện thoại
            <input name="phone" placeholder="0912345678" />
          </label>
          <label>
            Quan hệ với chủ hộ *
            <select name="relationship" defaultValue="TENANT">
              <option value="OWNER">Bản thân chủ sở hữu</option>
              <option value="FAMILY">Người trong gia đình</option>
              <option value="TENANT">Khách thuê nhà</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label>
            Ngày bắt đầu cư trú *
            <input type="date" name="validFrom" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", gridColumn: "1/-1", padding: "8px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" name="canViewBills" defaultChecked />
              <span>Cho phép xem hóa đơn</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="checkbox" name="canPayBills" defaultChecked />
              <span>Cho phép nộp tiền hóa đơn</span>
            </label>
          </div>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu cư dân</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>{kind === "owners" ? "Lịch sử & Danh sách sở hữu" : "Danh sách cư trú hiện tại"}</h2>
          <span>{people.data?.length ?? 0} hồ sơ</span>
        </div>
        {!apartmentId ? (
          <EmptyState title="Chọn một căn hộ" text="Thông tin chủ sở hữu và cư dân được giới hạn theo từng căn hộ." />
        ) : people.loading ? (
          <LoadingLine />
        ) : people.error ? (
          <ErrorBanner message={people.error} />
        ) : people.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>{kind === "owners" ? "Tỷ lệ sở hữu" : "Quan hệ / Quyền"}</th>
                  <th>Hiệu lực</th>
                  {canManage && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {people.data.map((person, index) => (
                  <tr key={String(person.id ?? index)}>
                    <td><strong className="table-primary">{String(person.full_name ?? "—")}</strong></td>
                    <td>{String(person.email ?? "—")}</td>
                    <td>{String(person.phone ?? "—")}</td>
                    <td>
                      {kind === "owners" ? (
                        <span style={{ fontWeight: 600 }}>{String(person.ownership_percent ?? "100")}% sở hữu</span>
                      ) : (
                        <div>
                          <strong>{String(person.relationship ?? "TENANT")}</strong>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            {person.can_view_bills ? "✓ Xem bill" : "✗ Không xem bill"} · {person.can_pay_bills ? "✓ Trả tiền" : "✗ Không trả tiền"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      {String(person.valid_from ?? "—")} {person.valid_to ? `đến ${String(person.valid_to)}` : "· Hiện tại"}
                    </td>
                    {canManage && (
                      <td>
                        {!person.valid_to && (
                          <button
                            className="button button-quiet"
                            style={{ fontSize: "11px", padding: "4px 8px", color: "#b91c1c" }}
                            onClick={() => endRelation(String(person.id))}
                          >
                            Kết thúc
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có hồ sơ liên kết" text="Chưa ghi nhận chủ sở hữu hoặc cư dân cho căn hộ này. Bấm Thêm để tạo mới." />
        )}
      </section>
    </>
  );
}

function InvoicesPage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const [tab, setTab] = useState<"invoices" | "periods">("invoices");
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const periods = useRemote<BillingPeriod[]>("/billing-periods", "billingPeriods");
  const buildings = useRemote<Building[]>("/buildings", "buildings");

  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<string | null>(null);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [openCreatePeriod, setOpenCreatePeriod] = useState(false);
  const [periodError, setPeriodError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function createPeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPeriodError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/billing-periods", {
        method: "POST",
        body: JSON.stringify({
          buildingId: form.get("buildingId"),
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          dueDate: form.get("dueDate"),
        }),
      });
      (e.currentTarget as HTMLFormElement).reset();
      setOpenCreatePeriod(false);
      periods.reload();
      notify("Đã tạo kỳ thu phí mới.");
    } catch (err) {
      setPeriodError((err as Error).message);
    }
  }

  async function generateInvoices(periodId: string) {
    setBusyAction(`gen-${periodId}`);
    try {
      const res = await api<ApiResult<{ generatedCount: number }>>(`/billing-periods/${periodId}/generate`, { method: "POST" });
      periods.reload();
      invoices.reload();
      notify(`Đã tự động tính toán và tạo ${res.data?.generatedCount ?? 0} hóa đơn.`);
    } catch (err) {
      notify(`Lỗi sinh hóa đơn: ${(err as Error).message}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function issuePeriod(periodId: string) {
    setBusyAction(`issue-${periodId}`);
    try {
      await api(`/billing-periods/${periodId}/issue`, { method: "POST" });
      periods.reload();
      invoices.reload();
      notify("Đã phát hành hóa đơn của kỳ thu thành công tới cư dân!");
    } catch (err) {
      notify(`Lỗi phát hành: ${(err as Error).message}`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Hóa đơn & Kỳ thu phí"
        subtitle="Quản lý kỳ thu, tính toán tiền điện/nước/phí tự động và theo dõi công nợ."
        action={
          canManage && tab === "periods" ? (
            <button className="button button-primary" onClick={() => setOpenCreatePeriod(!openCreatePeriod)}>
              <Icon name="plus" /> Mở kỳ thu phí mới
            </button>
          ) : undefined
        }
      />

      <div className="toolbar-row">
        <div className="segmented">
          <button className={tab === "invoices" ? "segment-active" : ""} onClick={() => setTab("invoices")}>
            Danh sách hóa đơn ({invoices.data?.length ?? 0})
          </button>
          <button className={tab === "periods" ? "segment-active" : ""} onClick={() => setTab("periods")}>
            Kỳ thu phí & Lập hóa đơn tự động ({periods.data?.length ?? 0})
          </button>
        </div>
      </div>

      {tab === "periods" && (
        <>
          {openCreatePeriod && (
            <form className="surface inline-form" onSubmit={createPeriod}>
              <h2>Tạo kỳ thu phí mới</h2>
              <label>
                Tòa nhà
                <select name="buildingId" required>
                  <option value="">Chọn tòa nhà</option>
                  {(buildings.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Từ ngày
                  <input type="date" name="periodStart" required defaultValue={new Date().toISOString().slice(0, 7) + "-01"} />
                </label>
                <label>
                  Đến ngày
                  <input type="date" name="periodEnd" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
              </div>
              <label>
                Hạn thanh toán
                <input type="date" name="dueDate" required defaultValue={new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)} />
              </label>
              {periodError && <ErrorBanner message={periodError} />}
              <button className="button button-primary">Tạo kỳ thu phí</button>
            </form>
          )}

          <section className="surface table-surface">
            <div className="table-header">
              <h2>Danh sách kỳ thu phí</h2>
              <button className="button button-quiet" onClick={periods.reload}>Làm mới</button>
            </div>
            {periods.loading ? (
              <LoadingLine />
            ) : periods.error ? (
              <ErrorBanner message={periods.error} />
            ) : periods.data?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Tòa nhà</th>
                      <th>Kỳ phí</th>
                      <th>Hạn thanh toán</th>
                      <th>Số hóa đơn</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      {canManage && <th>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.data.map((p) => (
                      <tr key={p.id}>
                        <td><strong className="table-primary">{p.building_name}</strong></td>
                        <td>{date(p.period_start)} – {date(p.period_end)}</td>
                        <td>{date(p.due_date)}</td>
                        <td>{p.invoice_count} hóa đơn</td>
                        <td><strong>{money(p.total_amount)}</strong></td>
                        <td><StatusTag value={p.status} /></td>
                        {canManage && (
                          <td style={{ display: "flex", gap: "6px" }}>
                            {p.status === "DRAFT" && (
                              <button
                                className="button button-primary"
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                                disabled={busyAction === `gen-${p.id}`}
                                onClick={() => generateInvoices(p.id)}
                              >
                                {busyAction === `gen-${p.id}` ? "Đang tính..." : "Sinh hóa đơn tự động"}
                              </button>
                            )}
                            {p.status === "GENERATED" && (
                              <>
                                <button
                                  className="button button-primary"
                                  style={{ fontSize: "11px", padding: "4px 8px" }}
                                  disabled={busyAction === `issue-${p.id}`}
                                  onClick={() => issuePeriod(p.id)}
                                >
                                  {busyAction === `issue-${p.id}` ? "Đang phát hành..." : "Phát hành hóa đơn"}
                                </button>
                                <button
                                  className="button button-quiet"
                                  style={{ fontSize: "11px", padding: "4px 8px" }}
                                  disabled={busyAction === `gen-${p.id}`}
                                  onClick={() => generateInvoices(p.id)}
                                >
                                  Tính lại
                                </button>
                              </>
                            )}
                            {p.status === "ISSUED" && (
                              <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>✓ Đã phát hành</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Chưa có kỳ thu phí" text="Tạo kỳ thu mới để hệ thống tự động quét diện tích căn hộ, số điện nước và sinh hóa đơn." />
            )}
          </section>
        </>
      )}

      {tab === "invoices" && (
        <section className="surface table-surface">
          <div className="table-header">
            <h2>Hóa đơn căn hộ</h2>
            <button className="button button-quiet" onClick={invoices.reload}>Làm mới</button>
          </div>
          {invoices.loading ? (
            <LoadingLine />
          ) : invoices.error ? (
            <ErrorBanner message={invoices.error} />
          ) : invoices.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Căn hộ</th>
                    <th>Hạn thanh toán</th>
                    <th>Tổng tiền</th>
                    <th>Đã trả</th>
                    <th>Còn lại</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.data.map((invoice) => (
                    <tr key={invoice.id}>
                      <td><strong className="table-primary">{invoice.invoice_number}</strong></td>
                      <td>{invoice.apartment_code}</td>
                      <td>{date(invoice.due_date)}</td>
                      <td>{money(invoice.total_amount)}</td>
                      <td>{money(invoice.paid_amount)}</td>
                      <td><strong style={{ color: Number(invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>{money(invoice.balance_due)}</strong></td>
                      <td><StatusTag value={invoice.status} /></td>
                      <td style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="button button-quiet"
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                          onClick={() => setSelectedInvoiceForDetail(invoice.id)}
                        >
                          Chi tiết
                        </button>
                        {canManage && Number(invoice.balance_due) > 0 && invoice.status !== "DRAFT" && (
                          <button
                            className="button button-primary"
                            style={{ fontSize: "11px", padding: "4px 8px" }}
                            onClick={() => setSelectedInvoiceForPay(invoice)}
                          >
                            Thu tiền
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Chưa có hóa đơn" text="Hóa đơn xuất hiện sau khi tạo kỳ thu và ấn Sinh hóa đơn tự động." />
          )}
        </section>
      )}

      {selectedInvoiceForDetail && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceForDetail}
          onClose={() => setSelectedInvoiceForDetail(null)}
        />
      )}

      {selectedInvoiceForPay && (
        <PaymentModal
          invoice={selectedInvoiceForPay}
          onClose={() => setSelectedInvoiceForPay(null)}
          onSuccess={() => {
            setSelectedInvoiceForPay(null);
            invoices.reload();
            notify("Đã ghi nhận thanh toán thành công!");
          }}
        />
      )}
    </>
  );
}

function MaintenancePage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const items = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");
  async function updateStatus(item: MaintenanceRequest, status: string) {
    try { await api(`/maintenance-requests/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); items.reload(); notify("Đã cập nhật yêu cầu bảo trì."); }
    catch (reason) { notify((reason as Error).message); }
  }
  return <><PageHeading title="Yêu cầu bảo trì" subtitle="Theo dõi tiến độ và mức độ ưu tiên của từng yêu cầu." />
    <section className="surface table-surface"><div className="table-header"><h2>Danh sách yêu cầu</h2><button className="button button-quiet" onClick={items.reload}>Làm mới</button></div>{items.loading ? <LoadingLine /> : items.error ? <ErrorBanner message={items.error} /> : items.data?.length ? <div className="table-scroll"><table><thead><tr><th>Yêu cầu</th><th>Căn hộ</th><th>Ưu tiên</th><th>Ngày gửi</th><th>Trạng thái</th>{canManage && <th>Cập nhật</th>}</tr></thead><tbody>{items.data.map((item) => <tr key={item.id}><td><strong className="table-primary">{item.title}</strong><small className="table-subline">{item.description}</small></td><td>{item.apartment_code}</td><td><StatusTag value={item.priority} /></td><td>{date(item.created_at)}</td><td><StatusTag value={item.status} /></td>{canManage && <td><select aria-label={`Cập nhật ${item.title}`} value={item.status} onChange={(event) => updateStatus(item, event.target.value)}><option value="PENDING">Chờ xử lý</option><option value="IN_PROGRESS">Đang xử lý</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select></td>}</tr>)}</tbody></table></div> : <EmptyState title="Không có yêu cầu cần xử lý" text="Yêu cầu bảo trì mới sẽ xuất hiện tại đây." />}</section>
  </>;
}

function NoticesPage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const notices = useRemote<Notice[]>("/notifications", "notifications");
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    try { await api("/notifications", { method: "POST", body: JSON.stringify({ buildingId: form.get("buildingId"), title: form.get("title"), content: form.get("content") }) }); (event.currentTarget as HTMLFormElement).reset(); setOpen(false); notices.reload(); notify("Đã gửi thông báo đến cư dân."); }
    catch (reason) { setError((reason as Error).message); }
  }
  return <><PageHeading title="Thông báo" subtitle="Thông tin được gửi đến chủ sở hữu và cư dân hiện tại." action={canManage && buildings.data?.length ? <button className="button button-primary" onClick={() => setOpen(!open)}><Icon name="plus" /> Tạo thông báo</button> : undefined} />
    {open && <form className="surface inline-form notice-form" onSubmit={publish}><h2>Thông báo mới</h2><label>Tòa nhà<select name="buildingId" required><option value="">Chọn tòa nhà</option>{(buildings.data ?? []).map((building) => <option value={building.id} key={building.id}>{building.name}</option>)}</select></label><label>Tiêu đề<input name="title" required maxLength={200} /></label><label>Nội dung<textarea name="content" rows={4} required /></label>{error && <ErrorBanner message={error} />}<button className="button button-primary">Gửi thông báo</button></form>}
    {notices.loading ? <LoadingLine /> : notices.error ? <ErrorBanner message={notices.error} /> : notices.data?.length ? <div className="notice-list">{notices.data.map((notice) => <NoticeItem key={notice.id} notice={notice} onRead={async () => { await api(`/notifications/${notice.id}/read`, { method: "POST" }); notices.reload(); notify("Đã đánh dấu đã đọc."); }} />)}</div> : <div className="surface"><EmptyState title="Chưa có thông báo" text="Thông báo đã gửi sẽ được lưu ở đây." /></div>}
  </>;
}

function UtilityReadingsPage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const readings = useRemote<UtilityReading[]>("/utility-readings", "readings");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const [elecPrev, setElecPrev] = useState(0);
  const [elecCurr, setElecCurr] = useState(0);
  const [waterPrev, setWaterPrev] = useState(0);
  const [waterCurr, setWaterCurr] = useState(0);

  const elecUsage = Math.max(0, elecCurr - elecPrev);
  const waterUsage = Math.max(0, waterCurr - waterPrev);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/utility-readings", {
        method: "POST",
        body: JSON.stringify({
          apartmentId: form.get("apartmentId"),
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          electricPrevious: form.get("electricPrevious"),
          electricCurrent: form.get("electricCurrent"),
          waterPrevious: form.get("waterPrevious"),
          waterCurrent: form.get("waterCurrent"),
          note: form.get("note"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      readings.reload();
      notify("Đã lưu chỉ số điện nước thành công.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Chỉ số điện & nước"
        subtitle="Ghi nhận số công tơ định kỳ hàng tháng để làm cơ sở tự động tính hóa đơn."
        action={
          canManage ? (
            <button className="button button-primary" onClick={() => setOpen(!open)}>
              <Icon name="plus" /> Ghi chỉ số mới
            </button>
          ) : undefined
        }
      />
      {open && (
        <form className="surface inline-form" onSubmit={submit}>
          <h2>Ghi chỉ số điện nước tháng</h2>
          <label>
            Căn hộ *
            <select name="apartmentId" required>
              <option value="">Chọn căn hộ</option>
              {(apartments.data ?? []).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.building_name} · {item.code}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Từ ngày *
              <input type="date" name="periodStart" required defaultValue={new Date().toISOString().slice(0, 7) + "-01"} />
            </label>
            <label>
              Đến ngày *
              <input type="date" name="periodEnd" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Điện kỳ trước (kWh) *
              <input
                type="number"
                step="1"
                min="0"
                name="electricPrevious"
                required
                onChange={(e) => setElecPrev(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Điện kỳ này (kWh) *
              <input
                type="number"
                step="1"
                min="0"
                name="electricCurrent"
                required
                onChange={(e) => setElecCurr(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "4px", fontSize: "11px", gridColumn: "1/-1" }}>
            Tiêu thụ điện dự kiến: <strong style={{ color: "#d97706" }}>{elecUsage} kWh</strong>
          </div>
          <div className="form-row">
            <label>
              Nước kỳ trước (m³) *
              <input
                type="number"
                step="1"
                min="0"
                name="waterPrevious"
                required
                onChange={(e) => setWaterPrev(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Nước kỳ này (m³) *
              <input
                type="number"
                step="1"
                min="0"
                name="waterCurrent"
                required
                onChange={(e) => setWaterCurr(Number(e.target.value) || 0)}
              />
            </label>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "4px", fontSize: "11px", gridColumn: "1/-1" }}>
            Tiêu thụ nước dự kiến: <strong style={{ color: "#0284c7" }}>{waterUsage} m³</strong>
          </div>
          <label style={{ gridColumn: "1/-1" }}>
            Ghi chú
            <input name="note" placeholder="VD: Công tơ hoạt động bình thường" />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu chỉ số</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>Lịch sử chỉ số công tơ</h2>
          <button className="button button-quiet" onClick={readings.reload}>Làm mới</button>
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
                  <th>Kỳ chốt</th>
                  <th>Điện (Cũ → Mới)</th>
                  <th>Tiêu thụ Điện</th>
                  <th>Nước (Cũ → Mới)</th>
                  <th>Tiêu thụ Nước</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {readings.data.map((item) => {
                  const eUsage = Number(item.electric_current) - Number(item.electric_previous);
                  const wUsage = Number(item.water_current) - Number(item.water_previous);
                  return (
                    <tr key={item.id}>
                      <td><strong className="table-primary">{item.apartment_code}</strong></td>
                      <td>{date(item.period_start)} – {date(item.period_end)}</td>
                      <td>{item.electric_previous} → {item.electric_current}</td>
                      <td><strong style={{ color: "#d97706" }}>{eUsage} kWh</strong></td>
                      <td>{item.water_previous} → {item.water_current}</td>
                      <td><strong style={{ color: "#0284c7" }}>{wUsage} m³</strong></td>
                      <td><small>{item.note || "—"}</small></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có dữ liệu" text="Ghi nhận chỉ số điện nước hàng tháng để tự động xuất hóa đơn." />
        )}
      </section>
    </>
  );
}

function FeeTypesPage({ canManage, notify }: { canManage: boolean; notify: (message: string) => void }) {
  const feeTypes = useRemote<FeeType[]>("/fee-types", "feeTypes");
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const methodLabels: Record<string, { label: string; unit: string }> = {
    PER_SQM: { label: "Theo diện tích căn hộ", unit: "₫ / m² / tháng" },
    ELECTRICITY: { label: "Điện sinh hoạt", unit: "₫ / kWh" },
    WATER: { label: "Nước sinh hoạt", unit: "₫ / m³" },
    FIXED: { label: "Cố định mỗi căn hộ", unit: "₫ / căn / tháng" },
    MANUAL: { label: "Nhập tay từng kỳ", unit: "₫" },
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/fee-types", {
        method: "POST",
        body: JSON.stringify({
          buildingId: form.get("buildingId"),
          code: form.get("code"),
          name: form.get("name"),
          calculationMethod: form.get("calculationMethod"),
          unitPrice: form.get("unitPrice"),
        }),
      });
      (event.currentTarget as HTMLFormElement).reset();
      setOpen(false);
      feeTypes.reload();
      notify("Đã lưu biểu phí thành công.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading
        title="Biểu phí dịch vụ & Đơn giá"
        subtitle="Cấu hình đơn giá phí quản lý, đơn giá điện, nước và dịch vụ áp dụng tự động cho hóa đơn."
        action={
          canManage ? (
            <button className="button button-primary" onClick={() => setOpen(!open)}>
              <Icon name="plus" /> Thêm biểu phí
            </button>
          ) : undefined
        }
      />
      {open && (
        <form className="surface inline-form" onSubmit={submit}>
          <h2>Thêm loại phí mới</h2>
          <label>
            Tòa nhà *
            <select name="buildingId" required>
              <option value="">Chọn tòa nhà</option>
              {(buildings.data ?? []).map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Mã loại phí *
            <input name="code" required placeholder="VD: DIEN-SH, NUOC-SH, QL-SQM" />
          </label>
          <label>
            Tên biểu phí *
            <input name="name" required placeholder="VD: Tiền điện sinh hoạt" />
          </label>
          <label>
            Phương pháp tính *
            <select name="calculationMethod">
              <option value="PER_SQM">Theo diện tích (m²)</option>
              <option value="ELECTRICITY">Chỉ số điện (kWh)</option>
              <option value="WATER">Chỉ số nước (m³)</option>
              <option value="FIXED">Cố định hàng tháng</option>
            </select>
          </label>
          <label>
            Đơn giá (VNĐ) *
            <input type="number" name="unitPrice" required min="0" placeholder="VD: 3000" />
          </label>
          {error && <ErrorBanner message={error} />}
          <button className="button button-primary">Lưu biểu phí</button>
        </form>
      )}

      <section className="surface table-surface">
        <div className="table-header">
          <h2>Danh sách biểu phí áp dụng</h2>
          <button className="button button-quiet" onClick={feeTypes.reload}>Làm mới</button>
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
                  <th>Mã phí</th>
                  <th>Tên phí</th>
                  <th>Phương pháp tính</th>
                  <th>Đơn giá</th>
                  <th>Đơn vị tính</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {feeTypes.data.map((item) => {
                  const meta = methodLabels[item.calculation_method] ?? { label: item.calculation_method, unit: "₫" };
                  return (
                    <tr key={item.id}>
                      <td><strong className="table-primary">{item.code}</strong></td>
                      <td>{item.name}</td>
                      <td>{meta.label}</td>
                      <td><strong>{money(item.unit_price)}</strong></td>
                      <td><small style={{ color: "#64748b" }}>{meta.unit}</small></td>
                      <td>
                        <span style={{ color: item.active ? "#15803d" : "#64748b", fontWeight: 600, fontSize: "11px" }}>
                          {item.active ? "● Đang áp dụng" : "○ Tạm dừng"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có biểu phí" text="Cấu hình biểu phí để hệ thống tự động tính thành tiền trong kỳ thu." />
        )}
      </section>
    </>
  );
}

function ResidentPage({ page, setPage, notify }: { page: PageId; setPage: (page: PageId) => void; notify: (message: string) => void }) {
  if (page === "invoices") return <ResidentInvoices />;
  if (page === "maintenance") return <ResidentMaintenance notify={notify} />;
  if (page === "notices") return <ResidentNotices notify={notify} />;
  if (page === "utility-readings") return <ResidentUtilityReadings />;
  if (page === "fee-types") return <ResidentFeeTypes />;
  return <ResidentDashboard setPage={setPage} />;
}

function ResidentUtilityReadings() {
  const readings = useRemote<UtilityReading[]>("/utility-readings", "readings");
  return (
    <>
      <PageHeading title="Lịch sử số điện & nước" subtitle="Theo dõi mức tiêu thụ điện nước thực tế của căn hộ qua các kỳ." />
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Chỉ số công tơ</h2>
          <button className="button button-quiet" onClick={readings.reload}>Làm mới</button>
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
                      <td><strong className="table-primary">{item.apartment_code}</strong></td>
                      <td>{date(item.period_start)} – {date(item.period_end)}</td>
                      <td>{item.electric_previous} → {item.electric_current}</td>
                      <td><strong style={{ color: "#d97706" }}>{eUsage} kWh</strong></td>
                      <td>{item.water_previous} → {item.water_current}</td>
                      <td><strong style={{ color: "#0284c7" }}>{wUsage} m³</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có dữ liệu chỉ số" text="Ban quản lý chưa cập nhật chỉ số điện nước cho căn hộ của bạn." />
        )}
      </section>
    </>
  );
}

function ResidentFeeTypes() {
  const feeTypes = useRemote<FeeType[]>("/fee-types", "feeTypes");
  const methodLabels: Record<string, string> = {
    PER_SQM: "Theo m² diện tích",
    ELECTRICITY: "Theo kWh điện tiêu thụ",
    WATER: "Theo m³ nước tiêu thụ",
    FIXED: "Cố định mỗi căn",
  };
  return (
    <>
      <PageHeading title="Biểu phí tòa nhà" subtitle="Danh mục các đơn giá dịch vụ đang được áp dụng tại chung cư." />
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Biểu phí công khai</h2>
          <button className="button button-quiet" onClick={feeTypes.reload}>Làm mới</button>
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
                    <td><strong className="table-primary">{item.code}</strong></td>
                    <td>{item.name}</td>
                    <td>{methodLabels[item.calculation_method] ?? item.calculation_method}</td>
                    <td><strong>{money(item.unit_price)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có biểu phí" text="Biểu phí sẽ hiển thị khi Ban quản lý ban hành đơn giá." />
        )}
      </section>
    </>
  );
}

function ResidentDashboard({ setPage }: { setPage: (page: PageId) => void }) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const maintenance = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");
  const notices = useRemote<Notice[]>("/notifications", "notifications");
  const balance = (invoices.data ?? []).reduce((sum, invoice) => sum + Number(invoice.balance_due), 0);
  const apartment = apartments.data?.[0];
  return <><PageHeading title={`Xin chào${apartment ? `, cư dân ${apartment.code}` : ""}`} subtitle="Thông tin căn hộ và dịch vụ của bạn." />
    {[apartments, invoices, maintenance, notices].some((item) => item.error) && <ErrorBanner message={[apartments, invoices, maintenance, notices].find((item) => item.error)?.error ?? "Không thể tải dữ liệu."} />}
    <section className="resident-feature"><div><p className="eyebrow">Căn hộ của bạn</p><h2>{apartment?.code ?? "Chưa có căn hộ liên kết"}</h2><p>{apartment ? `${apartment.building_name} · ${apartment.block_name} · Tầng ${apartment.floor_number}` : "Liên hệ Ban quản lý để kiểm tra hồ sơ cư trú."}</p></div><div className="resident-feature-aside"><span className="feature-sq"><Icon name="apartment" /></span>{apartment?.area_sqm && <small>{apartment.area_sqm} m²</small>}</div></section>
    <section className="resident-metrics"><button className="resident-metric" onClick={() => setPage("invoices")}><span className="resident-metric-icon icon-warm"><Icon name="invoice" /></span><span><small>Hóa đơn còn phải trả</small><strong>{money(balance)}</strong><em>{invoices.data?.filter((item) => Number(item.balance_due) > 0).length ?? 0} hóa đơn</em></span><Icon name="arrow" className="metric-arrow" /></button><button className="resident-metric" onClick={() => setPage("maintenance")}><span className="resident-metric-icon icon-cyan"><Icon name="wrench" /></span><span><small>Yêu cầu bảo trì</small><strong>{maintenance.data?.length ?? 0}</strong><em>Gửi và theo dõi yêu cầu</em></span><Icon name="arrow" className="metric-arrow" /></button><button className="resident-metric" onClick={() => setPage("notices")}><span className="resident-metric-icon icon-ink"><Icon name="bell" /></span><span><small>Thông báo chưa đọc</small><strong>{notices.data?.filter((item) => !item.read_at).length ?? 0}</strong><em>Thông tin từ Ban quản lý</em></span><Icon name="arrow" className="metric-arrow" /></button></section>
    <section className="resident-lower"><div className="surface resident-next"><div className="section-heading"><div><p className="eyebrow">Việc cần lưu ý</p><h2>Hóa đơn gần nhất</h2></div><button className="text-button" onClick={() => setPage("invoices")}>Xem hóa đơn</button></div>{invoices.loading ? <LoadingLine /> : (() => { const due = invoices.data?.filter((item) => Number(item.balance_due) > 0).slice(0, 3) ?? []; return due.length ? due.map((item) => <div className="next-row" key={item.id}><div><strong>{item.invoice_number}</strong><small>Căn {item.apartment_code} · Hạn {date(item.due_date)}</small></div><strong>{money(item.balance_due)}</strong></div>) : <EmptyState title="Bạn đã thanh toán" text="Hiện không có hóa đơn còn nợ." />; })()}</div>
      <div className="resident-help"><span className="help-mark"><Icon name="wrench" /></span><p className="eyebrow">Cần hỗ trợ?</p><h2>Gửi yêu cầu bảo trì</h2><p>Mô tả vấn đề để Ban quản lý tiếp nhận và theo dõi.</p><button className="button button-primary" onClick={() => setPage("maintenance")}>Tạo yêu cầu</button></div></section>
  </>;
}

function ResidentInvoices() {
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function pay(invoice: Invoice) {
    setBusy(invoice.id); setMessage("");
    try {
      const key = crypto.randomUUID();
      await api("/payments", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ invoiceId: invoice.id, amount: invoice.balance_due, method: "SIMULATED", idempotencyKey: key }) });
      invoices.reload(); setMessage(`Thanh toán mô phỏng thành công cho hóa đơn ${invoice.invoice_number}.`);
    } catch (reason) { setMessage((reason as Error).message); }
    finally { setBusy(""); }
  }
  return <><PageHeading title="Hóa đơn của tôi" subtitle="Xem bảng kê chi tiết khoản phí và thực hiện thanh toán trực tuyến." />{message && <div className="inline-message" role="status">{message}</div>}{invoices.loading ? <LoadingLine /> : invoices.error ? <ErrorBanner message={invoices.error} /> : invoices.data?.length ? <div className="resident-invoice-list">{invoices.data.map((invoice) => <article className="surface resident-invoice" key={invoice.id}><div className="invoice-symbol"><Icon name="invoice" /></div><div className="invoice-main"><strong>{invoice.invoice_number}</strong><small>Căn {invoice.apartment_code} · Hạn {date(invoice.due_date)}</small><StatusTag value={invoice.status} /></div><div className="invoice-total"><small>Còn phải trả</small><strong style={{ color: Number(invoice.balance_due) > 0 ? "#b91c1c" : "#15803d" }}>{money(invoice.balance_due)}</strong></div><div style={{ display: "flex", gap: "8px" }}><button className="button button-quiet" style={{ fontSize: "11px", padding: "6px 10px" }} onClick={() => setSelectedInvoiceId(invoice.id)}>Xem chi tiết</button>{Number(invoice.balance_due) > 0 && <button className="button button-primary" disabled={busy === invoice.id} onClick={() => pay(invoice)}>{busy === invoice.id ? "Đang xử lý…" : "Thanh toán mô phỏng"}</button>}</div></article>)}</div> : <div className="surface"><EmptyState title="Chưa có hóa đơn" text="Hóa đơn sẽ hiển thị sau khi Ban quản lý phát hành kỳ thu." /></div>}
    {selectedInvoiceId && <InvoiceDetailModal invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />}
  </>;
}

function ResidentMaintenance({ notify }: { notify: (message: string) => void }) {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const requests = useRemote<MaintenanceRequest[]>("/maintenance-requests", "maintenanceRequests");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    try { await api("/maintenance-requests", { method: "POST", body: JSON.stringify({ apartmentId: form.get("apartmentId"), title: form.get("title"), description: form.get("description"), priority: form.get("priority") }) }); (event.currentTarget as HTMLFormElement).reset(); setOpen(false); requests.reload(); notify("Đã gửi yêu cầu bảo trì."); }
    catch (reason) { setError((reason as Error).message); }
  }
  return <><PageHeading title="Yêu cầu bảo trì" subtitle="Theo dõi yêu cầu hiện tại hoặc báo một vấn đề mới." action={<button className="button button-primary" onClick={() => setOpen(!open)}><Icon name="plus" /> Gửi yêu cầu</button>} />
    {open && <form className="surface inline-form request-form" onSubmit={submit}><h2>Yêu cầu mới</h2><label>Căn hộ<select name="apartmentId" required><option value="">Chọn căn hộ</option>{(apartments.data ?? []).map((item) => <option value={item.id} key={item.id}>{item.building_name} · {item.code}</option>)}</select></label><label>Tiêu đề<input name="title" maxLength={200} required placeholder="Ví dụ: Đèn hành lang không sáng" /></label><label>Mô tả<textarea name="description" rows={4} required placeholder="Mô tả vị trí và tình trạng bạn gặp." /></label><label>Mức độ ưu tiên<select name="priority"><option value="MEDIUM">Thông thường</option><option value="HIGH">Cao</option><option value="LOW">Thấp</option></select></label>{error && <ErrorBanner message={error} />}<button className="button button-primary">Gửi yêu cầu</button></form>}
    {requests.loading ? <LoadingLine /> : requests.error ? <ErrorBanner message={requests.error} /> : requests.data?.length ? <div className="request-list">{requests.data.map((item) => <article className="surface request-item" key={item.id}><div className="request-mark"><Icon name="wrench" /></div><div className="request-copy"><strong>{item.title}</strong><small>{item.apartment_code} · {date(item.created_at)}</small><p>{item.description}</p></div><StatusTag value={item.status} /></article>)}</div> : <div className="surface"><EmptyState title="Chưa có yêu cầu bảo trì" text="Nếu có vấn đề với căn hộ, hãy gửi yêu cầu để Ban quản lý tiếp nhận." /></div>}
  </>;
}

function ResidentNotices({ notify }: { notify: (message: string) => void }) {
  const notices = useRemote<Notice[]>("/notifications", "notifications");
  return <><PageHeading title="Thông báo" subtitle="Thông tin mới từ Ban quản lý tòa nhà." />{notices.loading ? <LoadingLine /> : notices.error ? <ErrorBanner message={notices.error} /> : notices.data?.length ? <div className="notice-list">{notices.data.map((item) => <NoticeItem key={item.id} notice={item} onRead={async () => { try { await api(`/notifications/${item.id}/read`, { method: "POST" }); notices.reload(); notify("Đã đánh dấu đã đọc."); } catch (reason) { notify((reason as Error).message); } }} />)}</div> : <div className="surface"><EmptyState title="Chưa có thông báo" text="Thông báo mới sẽ xuất hiện ở đây." /></div>}</>;
}

function NoticeItem({ notice, onRead }: { notice: Notice; onRead: () => void }) {
  return <article className={`surface notice-item ${notice.read_at ? "notice-read" : ""}`}><span className="notice-indicator">{!notice.read_at && <i />}</span><div className="notice-copy"><div className="notice-title-row"><h2>{notice.title}</h2><small>{date(notice.publish_at ?? notice.created_at)}</small></div><p>{notice.content}</p></div>{!notice.read_at && <button className="text-button" onClick={onRead}>Đánh dấu đã đọc</button>}</article>;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function Metric({ label, value, detail, accent }: { label: string; value: string | number; detail: string; accent: string }) {
  return <article className={`metric metric-${accent}`}><span className="metric-rail" /><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span className="empty-building"><Icon name="building" /></span><h3>{title}</h3><p>{text}</p></div>;
}
function ErrorBanner({ message }: { message: string }) { return <div className="error-banner" role="alert"><strong>Không tải được dữ liệu</strong><span>{message}</span></div>; }
function LoadingLine() { return <div className="loading-line" role="status"><span /> Đang tải dữ liệu từ hệ thống…</div>; }
function StatusTag({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = ["active", "paid", "completed"].includes(normalized) ? "positive" : ["pending", "issued", "partially_paid", "in_progress", "maintenance", "high", "critical"].includes(normalized) ? "warning" : ["inactive", "disabled", "cancelled", "void"].includes(normalized) ? "muted" : "neutral";
  return <span className={`status-tag status-${tone}`}><i />{statusLabel(value)}</span>;
}
function initials(value: string) { return value.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join(""); }
function roleLabel(role?: string) { const labels: Record<string, string> = { SUPER_ADMIN: "Quản trị hệ thống", ORG_ADMIN: "Quản trị tổ chức", BUILDING_MANAGER: "Ban quản lý", MANAGEMENT_STAFF: "Nhân viên vận hành", ACCOUNTANT: "Kế toán", TECHNICIAN: "Kỹ thuật", BOARD_MEMBER: "Ban quản trị", OWNER: "Chủ sở hữu", RESIDENT: "Cư dân" }; return role ? labels[role] ?? role : "Người dùng"; }
function statusLabel(status: string) { const labels: Record<string, string> = { ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động", MAINTENANCE: "Đang bảo trì", DRAFT: "Bản nháp", GENERATED: "Đã tạo", ISSUED: "Đã phát hành", PARTIALLY_PAID: "Đã thanh toán một phần", PAID: "Đã thanh toán", VOID: "Đã hủy", PENDING: "Chờ xử lý", IN_PROGRESS: "Đang xử lý", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy", LOW: "Thấp", MEDIUM: "Thông thường", HIGH: "Cao", CRITICAL: "Khẩn cấp", LOCKED: "Đã khóa", DISABLED: "Đã vô hiệu hóa" }; return labels[status] ?? status; }
function money(value: string | number | null | undefined) { return `${Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫`; }
function date(value: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "—"; }
