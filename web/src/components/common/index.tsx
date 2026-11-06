import React from "react";
import { Icon } from "../../icons";
import { statusLabel } from "../../utils/format";

export function PageHeading({
  title,
  subtitle,
  action,
  onBack,
  backLabel,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="page-heading">
      <div className="page-heading-content">
        {onBack && (
          <button
            type="button"
            className="button-back"
            onClick={onBack}
            title={backLabel ? `Quay lại ${backLabel}` : "Quay lại"}
            aria-label={backLabel ? `Quay lại ${backLabel}` : "Quay lại"}
          >
            <Icon name="arrowLeft" />
            <span>{backLabel ?? "Quay lại"}</span>
          </button>
        )}
        <div className="page-heading-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={`metric metric-${accent} ${onClick ? "metric-interactive" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="metric-rail" />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {onClick && (
        <span className="metric-action-hint">
          <Icon name="arrow" />
        </span>
      )}
    </article>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-building">
        <Icon name="building" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <strong>Không tải được dữ liệu</strong>
      <span>{message}</span>
    </div>
  );
}

export function LoadingLine() {
  return (
    <div className="loading-line" role="status">
      <span /> Đang tải dữ liệu từ hệ thống…
    </div>
  );
}

export function StatusTag({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = ["active", "paid", "completed"].includes(normalized)
    ? "positive"
    : ["pending", "issued", "partially_paid", "in_progress", "maintenance", "high", "critical"].includes(normalized)
    ? "warning"
    : ["inactive", "disabled", "cancelled", "void"].includes(normalized)
    ? "muted"
    : "neutral";

  return (
    <span className={`status-tag status-${tone}`}>
      <i />
      {statusLabel(value)}
    </span>
  );
}

export function NoticeItem({
  notice,
  onRead,
}: {
  notice: { id: string; title: string; content: string; read_at: string | null; publish_at: string | null; created_at: string };
  onRead: () => void;
}) {
  const publishDate = notice.publish_at ?? notice.created_at;
  const formattedDate = publishDate
    ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(publishDate))
    : "—";

  return (
    <article className={`surface notice-item ${notice.read_at ? "notice-read" : ""}`}>
      <span className="notice-indicator">{!notice.read_at && <i />}</span>
      <div className="notice-copy">
        <div className="notice-title-row">
          <h2>{notice.title}</h2>
          <small>{formattedDate}</small>
        </div>
        <p>{notice.content}</p>
      </div>
      {!notice.read_at && (
        <button className="text-button" onClick={onRead}>
          Đánh dấu đã đọc
        </button>
      )}
    </article>
  );
}
