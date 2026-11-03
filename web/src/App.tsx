import { useEffect, useMemo, useState } from "react";
import { api, clearSession, hasSession, loadSession, login, logout } from "./api";
import type { ApiResult, Apartment, Building, DashboardSummary, Invoice, MaintenanceRequest, Notice, Session } from "./types";
import { Icon } from "./icons";

type PageId = "overview" | "buildings" | "apartments" | "people" | "invoices" | "maintenance" | "notices";
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

const navItems: { id: PageId; label: string; icon: "home" | "building" | "apartment" | "people" | "invoice" | "wrench" | "bell"; permission?: string }[] = [
  { id: "overview", label: "Tổng quan", icon: "home", permission: "dashboard:read" },
  { id: "buildings", label: "Tòa nhà", icon: "building", permission: "building:read" },
  { id: "apartments", label: "Căn hộ", icon: "apartment", permission: "apartment:read" },
  { id: "people", label: "Chủ sở hữu và cư dân", icon: "people", permission: "people:read" },
  { id: "invoices", label: "Hóa đơn", icon: "invoice", permission: "billing:read" },
  { id: "maintenance", label: "Bảo trì", icon: "wrench", permission: "maintenance:read" },
  { id: "notices", label: "Thông báo", icon: "bell", permission: "notification:read" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<PageId>("overview");
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

  if (!session || !hasSession()) return <Login onLogin={(next) => { setSession(next); setPage("overview"); }} />;

  const residentOnly = session.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role))
    && !session.scopes.some((scope) => !["OWNER", "RESIDENT"].includes(scope.role));
  const availableNav = residentOnly
    ? navItems.filter((item) => ["overview", "invoices", "maintenance", "notices"].includes(item.id))
    : navItems.filter((item) => !item.permission || session.permissions.includes(item.permission));
  const active = availableNav.find((item) => item.id === page) ?? availableNav[0];
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
        <nav>{availableNav.map((item) => <button key={item.id} className={`nav-link ${page === item.id ? "is-active" : ""}`} onClick={() => { setPage(item.id); setMobileMenu(false); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
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
            ? <ResidentPage page={page} setPage={setPage} notify={notify} />
            : <AdminPage page={page} session={session} notify={notify} />}
        </div>
      </main>
      {residentOnly && <nav className="mobile-bottom" aria-label="Điều hướng cư dân">{[
        { id: "overview" as PageId, label: "Trang chủ", icon: "home" as const },
        { id: "invoices" as PageId, label: "Hóa đơn", icon: "invoice" as const },
        { id: "maintenance" as PageId, label: "Bảo trì", icon: "wrench" as const },
        { id: "notices" as PageId, label: "Thông báo", icon: "bell" as const },
      ].map((item) => <button key={item.id} className={page === item.id ? "bottom-active" : ""} onClick={() => setPage(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>}
      {toast && <div className="toast" role="status"><span className="toast-check"><Icon name="check" /></span>{toast}<button className="icon-button" aria-label="Đóng thông báo" onClick={() => setToast("")}><Icon name="close" /></button></div>}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try { onLogin(await login(email.trim(), password)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
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
      <button className="button button-primary login-submit" disabled={loading}>{loading ? "Đang kiểm tra…" : "Đăng nhập"}<Icon name="arrow" /></button>
      <p className="login-support">Cần hỗ trợ? Liên hệ Ban quản lý tòa nhà.</p>
    </form></section>
  </main>;
}

function AdminPage({ page, session, notify }: { page: PageId; session: Session; notify: (message: string) => void }) {
  switch (page) {
    case "buildings": return <BuildingsPage canCreate={session.permissions.includes("building:manage") && session.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(scope.role))} notify={notify} />;
    case "apartments": return <ApartmentsPage canManage={session.permissions.includes("building:manage")} notify={notify} />;
    case "people": return <PeoplePage />;
    case "invoices": return <InvoicesPage />;
    case "maintenance": return <MaintenancePage canManage={session.permissions.includes("maintenance:manage")} notify={notify} />;
    case "notices": return <NoticesPage canManage={session.permissions.includes("notification:manage")} notify={notify} />;
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

function PeoplePage() {
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [apartmentId, setApartmentId] = useState("");
  const [kind, setKind] = useState<"owners" | "residents">("owners");
  const people = useRemote<Record<string, unknown>[]>(apartmentId ? `/apartments/${apartmentId}/${kind}` : "", kind);
  return <><PageHeading title="Chủ sở hữu và cư dân" subtitle="Mối quan hệ với căn hộ được lưu riêng và có thời hạn hiệu lực." />
    <div className="toolbar-row"><label className="select-label">Căn hộ<select value={apartmentId} onChange={(event) => setApartmentId(event.target.value)}><option value="">Chọn căn hộ</option>{(apartments.data ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.building_name} · {unit.code}</option>)}</select></label><div className="segmented"><button className={kind === "owners" ? "segment-active" : ""} onClick={() => setKind("owners")}>Chủ sở hữu</button><button className={kind === "residents" ? "segment-active" : ""} onClick={() => setKind("residents")}>Cư dân</button></div></div>
    <section className="surface table-surface"><div className="table-header"><h2>{kind === "owners" ? "Lịch sử sở hữu" : "Danh sách cư trú"}</h2><span>{people.data?.length ?? 0} hồ sơ</span></div>{!apartmentId ? <EmptyState title="Chọn một căn hộ" text="Thông tin chủ sở hữu và cư dân được giới hạn theo từng căn hộ." /> : people.loading ? <LoadingLine /> : people.error ? <ErrorBanner message={people.error} /> : people.data?.length ? <div className="table-scroll"><table><thead><tr><th>Họ và tên</th><th>Email</th><th>Điện thoại</th><th>Quan hệ</th><th>Hiệu lực</th></tr></thead><tbody>{people.data.map((person, index) => <tr key={String(person.id ?? index)}><td><strong className="table-primary">{String(person.full_name ?? "—")}</strong></td><td>{String(person.email ?? "—")}</td><td>{String(person.phone ?? "—")}</td><td>{String(person.relationship ?? (person.ownership_percent ? `${person.ownership_percent}% sở hữu` : "—"))}</td><td>{String(person.valid_from ?? "—")} {person.valid_to ? `đến ${String(person.valid_to)}` : "· Hiện tại"}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có hồ sơ liên kết" text="Chưa ghi nhận chủ sở hữu hoặc cư dân cho căn hộ này." />}</section>
  </>;
}

function InvoicesPage() {
  const invoices = useRemote<Invoice[]>("/invoices", "invoices");
  return <><PageHeading title="Hóa đơn và công nợ" subtitle="Theo dõi số đã lập, đã thanh toán và còn phải thu." />
    <section className="surface table-surface"><div className="table-header"><h2>Hóa đơn</h2><button className="button button-quiet" onClick={invoices.reload}>Làm mới</button></div>{invoices.loading ? <LoadingLine /> : invoices.error ? <ErrorBanner message={invoices.error} /> : invoices.data?.length ? <div className="table-scroll"><table><thead><tr><th>Mã hóa đơn</th><th>Căn hộ</th><th>Hạn thanh toán</th><th>Tổng tiền</th><th>Đã trả</th><th>Còn lại</th><th>Trạng thái</th></tr></thead><tbody>{invoices.data.map((invoice) => <tr key={invoice.id}><td><strong className="table-primary">{invoice.invoice_number}</strong></td><td>{invoice.apartment_code}</td><td>{date(invoice.due_date)}</td><td>{money(invoice.total_amount)}</td><td>{money(invoice.paid_amount)}</td><td><strong>{money(invoice.balance_due)}</strong></td><td><StatusTag value={invoice.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có hóa đơn" text="Hóa đơn xuất hiện sau khi kế toán tạo và phát hành kỳ thu." />}</section>
  </>;
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

function ResidentPage({ page, setPage, notify }: { page: PageId; setPage: (page: PageId) => void; notify: (message: string) => void }) {
  if (page === "invoices") return <ResidentInvoices />;
  if (page === "maintenance") return <ResidentMaintenance notify={notify} />;
  if (page === "notices") return <ResidentNotices notify={notify} />;
  return <ResidentDashboard setPage={setPage} />;
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
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function pay(invoice: Invoice) {
    setBusy(invoice.id); setMessage("");
    try {
      const key = crypto.randomUUID();
      await api("/payments", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify({ invoiceId: invoice.id, amount: invoice.balance_due, method: "SIMULATED", idempotencyKey: key }) });
      invoices.reload(); setMessage("Thanh toán mô phỏng thành công.");
    } catch (reason) { setMessage((reason as Error).message); }
    finally { setBusy(""); }
  }
  return <><PageHeading title="Hóa đơn của tôi" subtitle="Xem khoản phí và số tiền còn phải thanh toán." />{message && <div className="inline-message" role="status">{message}</div>}{invoices.loading ? <LoadingLine /> : invoices.error ? <ErrorBanner message={invoices.error} /> : invoices.data?.length ? <div className="resident-invoice-list">{invoices.data.map((invoice) => <article className="surface resident-invoice" key={invoice.id}><div className="invoice-symbol"><Icon name="invoice" /></div><div className="invoice-main"><strong>{invoice.invoice_number}</strong><small>Căn {invoice.apartment_code} · Hạn {date(invoice.due_date)}</small><StatusTag value={invoice.status} /></div><div className="invoice-total"><small>Còn phải trả</small><strong>{money(invoice.balance_due)}</strong></div>{Number(invoice.balance_due) > 0 && <button className="button button-primary" disabled={busy === invoice.id} onClick={() => pay(invoice)}>{busy === invoice.id ? "Đang xử lý…" : "Thanh toán mô phỏng"}</button>}</article>)}</div> : <div className="surface"><EmptyState title="Chưa có hóa đơn" text="Hóa đơn sẽ hiển thị sau khi Ban quản lý phát hành kỳ thu." /></div>}</>;
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
