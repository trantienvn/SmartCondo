export type Scope = {
  role: string;
  organization_id: string | null;
  building_id: string | null;
};

export type User = { id: string; email: string; fullName: string | null };
export type Session = { user: User; scopes: Scope[]; permissions: string[]; accessToken: string; refreshToken: string };
export type Building = { id: string; organization_id: string; code: string; name: string; address: string | null; status: string };
export type Apartment = {
  id: string; floor_id: string; code: string; area_sqm: string | null; bedroom_count: number | null;
  bathroom_count: number | null; operational_status: string; floor_number: number;
  block_id: string; block_name: string; building_id: string; building_name: string;
};
export type Invoice = {
  id: string; invoice_number: string; apartment_id: string; apartment_code: string;
  status: string; due_date: string; total_amount: string; paid_amount: string; balance_due: string;
};
export type MaintenanceRequest = {
  id: string; apartment_id: string; apartment_code: string; title: string; description: string;
  priority: string; status: string; created_at: string; updated_at: string;
};
export type Notice = { id: string; title: string; content: string; publish_at: string | null; read_at: string | null; created_at: string };
export type UtilityReading = {
  id: string; apartment_id: string; apartment_code: string; period_start: string; period_end: string;
  electric_previous: string; electric_current: string; water_previous: string; water_current: string;
  recorded_by: string; note: string | null; created_at: string;
};
export type FeeType = {
  id: string; building_id: string; code: string; name: string; calculation_method: string;
  unit_price: string; active: boolean;
};
export type BillingPeriod = {
  id: string; building_id: string; building_name: string;
  period_start: string; period_end: string; due_date: string;
  status: string; invoice_count: number; total_amount: string; created_at: string;
};
export type InvoiceItem = {
  id: string; description: string; quantity: string; unit_price: string; amount: string;
  fee_code: string | null; fee_name: string | null;
};
export type PaymentRecord = {
  id: string; amount: string; method: string; status: string; paid_at: string; idempotency_key: string | null;
};
export type InvoiceDetail = {
  invoice: Invoice;
  items: InvoiceItem[];
  payments: PaymentRecord[];
};
export type DashboardSummary = {
  buildingIds: string[];
  apartments: { total: number; occupied: number };
  invoices: { billed: string; outstanding: string };
  maintenance: { open: number; completed_this_month: number };
  utilities: { electricity_usage: string; water_usage: string };
};
export type ApiResult<T> = { success: true; data: T };
