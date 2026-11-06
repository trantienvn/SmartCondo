import React, { useState } from "react";
import { api, login } from "../../api";
import { Icon } from "../../icons";
import type { Session } from "../../types";

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      onLogin(await login(email.trim(), password));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function quickSeed() {
    setSeeding(true);
    setSeedMsg("");
    setError("");
    try {
      await api("/demo/seed", { method: "POST" });
      setSeedMsg("Đã khởi tạo thành công dữ liệu mẫu! Bạn có thể chọn tài khoản bên dưới để đăng nhập ngay.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand-lockup light-brand">
          <span className="brand-mark">
            <Icon name="building" />
          </span>
          <span>
            smart<span className="brand-light">condo</span>
          </span>
        </div>
        <div className="login-story-copy">
          <div className="building-line" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <p className="login-kicker">Quản lý tòa nhà, gọn trong một nơi</p>
          <h1>
            Vận hành rõ ràng.<br />
            <em>Cư dân an tâm.</em>
          </h1>
          <p className="login-intro">
            Thông tin căn hộ, phí dịch vụ và yêu cầu bảo trì được kết nối trong một không gian thống nhất.
          </p>
        </div>
        <div className="login-footer">
          <span>SmartCondo</span>
          <span>Quản lý chung cư thông minh</span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <p className="eyebrow">Chào mừng bạn</p>
          <h2>Đăng nhập</h2>
          <p className="login-hint">Dùng tài khoản được Ban quản lý cấp.</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="ten@vidu.vn"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Nhập mật khẩu"
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              <strong>Chưa thể đăng nhập</strong>
              <span>{error}</span>
            </div>
          )}
          {seedMsg && (
            <div
              className="form-error"
              style={{ background: "#e6fffa", borderColor: "#00b8d9", color: "#006677" }}
              role="status"
            >
              <strong>Thông báo</strong>
              <span>{seedMsg}</span>
            </div>
          )}
          <button className="button button-primary login-submit" disabled={loading}>
            {loading ? "Đang kiểm tra…" : "Đăng nhập"}
            <Icon name="arrow" />
          </button>

          <div className="demo-accounts">
            <p>⚡ Tài khoản Demo thử nghiệm nhanh:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <button
                type="button"
                className="button button-quiet"
                style={{ fontSize: "10px", padding: "4px 8px" }}
                onClick={() => {
                  setEmail("manager@smartcondo.vn");
                  setPassword("Manager@123");
                }}
              >
                🏢 Ban Quản Lý
              </button>
              <button
                type="button"
                className="button button-quiet"
                style={{ fontSize: "10px", padding: "4px 8px" }}
                onClick={() => {
                  setEmail("accountant@smartcondo.vn");
                  setPassword("Accountant@123");
                }}
              >
                💰 Kế toán
              </button>
              <button
                type="button"
                className="button button-quiet"
                style={{ fontSize: "10px", padding: "4px 8px" }}
                onClick={() => {
                  setEmail("resident@smartcondo.vn");
                  setPassword("Resident@123");
                }}
              >
                👤 Cư dân A-101
              </button>
              <button
                type="button"
                className="button button-quiet"
                style={{ fontSize: "10px", padding: "4px 8px" }}
                onClick={() => {
                  setEmail("admin@smartcondo.vn");
                  setPassword("Admin@123456");
                }}
              >
                👑 Admin
              </button>
            </div>
            <button
              type="button"
              className="text-button"
              style={{ marginTop: "10px", fontSize: "10px", color: "var(--cyan)" }}
              disabled={seeding}
              onClick={quickSeed}
            >
              {seeding ? "Đang nạp dữ liệu..." : "🔄 Nhấn vào đây để nạp lại dữ liệu mẫu Demo (1-Click)"}
            </button>
          </div>

          <p className="login-support">Cần hỗ trợ? Liên hệ Ban quản lý tòa nhà.</p>
        </form>
      </section>
    </main>
  );
}
