/**
 * SmartCondo Formatters and Display Utilities
 */

export function initials(value: string): string {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function roleLabel(role?: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Quản trị hệ thống",
    ORG_ADMIN: "Quản trị tổ chức",
    BUILDING_MANAGER: "Ban quản lý",
    MANAGEMENT_STAFF: "Nhân viên vận hành",
    ACCOUNTANT: "Kế toán",
    TECHNICIAN: "Kỹ thuật",
    BOARD_MEMBER: "Ban quản trị",
    OWNER: "Chủ sở hữu",
    RESIDENT: "Cư dân",
  };
  return role ? labels[role] ?? role : "Người dùng";
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Ngừng hoạt động",
    MAINTENANCE: "Đang bảo trì",
    DRAFT: "Bản nháp",
    GENERATED: "Đã tạo",
    ISSUED: "Đã phát hành",
    PARTIALLY_PAID: "Đã thanh toán một phần",
    PAID: "Đã thanh toán",
    VOID: "Đã hủy",
    PENDING: "Chờ xử lý",
    IN_PROGRESS: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    LOW: "Thấp",
    MEDIUM: "Thông thường",
    HIGH: "Cao",
    CRITICAL: "Khẩn cấp",
    LOCKED: "Đã khóa",
    DISABLED: "Đã vô hiệu hóa",
  };
  return labels[status] ?? status;
}

export function money(value: string | number | null | undefined): string {
  return `${Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫`;
}

export function date(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
    : "—";
}
