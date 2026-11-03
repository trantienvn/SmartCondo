CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  address text,
  email varchar(254),
  phone varchar(30),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  address text,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code),
  UNIQUE (id, organization_id)
);

CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, code),
  UNIQUE (id, building_id)
);

CREATE TABLE floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES blocks(id),
  floor_number integer NOT NULL,
  name varchar(100),
  UNIQUE (block_id, floor_number),
  UNIQUE (id, block_id)
);

CREATE TABLE apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL REFERENCES floors(id),
  code varchar(50) NOT NULL,
  area_sqm numeric(10,2) CHECK (area_sqm IS NULL OR area_sqm > 0),
  bedroom_count integer CHECK (bedroom_count IS NULL OR bedroom_count >= 0),
  bathroom_count integer CHECK (bathroom_count IS NULL OR bathroom_count >= 0),
  operational_status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (operational_status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (floor_id, code)
);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(200) NOT NULL,
  email varchar(254),
  phone varchar(30),
  address text,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX people_email_unique ON people (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE apartment_ownerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  person_id uuid NOT NULL REFERENCES people(id),
  ownership_percent numeric(5,2) NOT NULL DEFAULT 100 CHECK (ownership_percent > 0 AND ownership_percent <= 100),
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE (id, apartment_id)
);
CREATE INDEX apartment_ownerships_person_idx ON apartment_ownerships(person_id, valid_to);

CREATE TABLE apartment_residencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  person_id uuid NOT NULL REFERENCES people(id),
  relationship varchar(20) NOT NULL CHECK (relationship IN ('OWNER', 'TENANT', 'FAMILY', 'OTHER')),
  can_view_bills boolean NOT NULL DEFAULT false,
  can_pay_bills boolean NOT NULL DEFAULT false,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE (id, apartment_id)
);
CREATE INDEX apartment_residencies_person_idx ON apartment_residencies(person_id, valid_to);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL UNIQUE,
  description text
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id),
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  organization_id uuid REFERENCES organizations(id),
  building_id uuid REFERENCES buildings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, role_id, organization_id, building_id)
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE utility_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  electric_previous numeric(14,3) NOT NULL CHECK (electric_previous >= 0),
  electric_current numeric(14,3) NOT NULL CHECK (electric_current >= electric_previous),
  water_previous numeric(14,3) NOT NULL CHECK (water_previous >= 0),
  water_current numeric(14,3) NOT NULL CHECK (water_current >= water_previous),
  recorded_by uuid NOT NULL REFERENCES users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE (apartment_id, period_start, period_end)
);

CREATE TABLE fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  code varchar(50) NOT NULL,
  name varchar(150) NOT NULL,
  calculation_method varchar(20) NOT NULL CHECK (calculation_method IN ('FIXED', 'PER_SQM', 'ELECTRICITY', 'WATER', 'MANUAL')),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (building_id, code)
);

CREATE TABLE billing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'ISSUED', 'CLOSED')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE (building_id, period_start, period_end)
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_period_id uuid NOT NULL REFERENCES billing_periods(id),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  invoice_number varchar(80) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')),
  issued_at timestamptz,
  due_date date NOT NULL,
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (billing_period_id, apartment_id)
);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  fee_type_id uuid REFERENCES fee_types(id),
  description varchar(250) NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity >= 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0)
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method varchar(20) NOT NULL CHECK (method IN ('CASH', 'BANK_TRANSFER', 'SIMULATED')),
  status varchar(20) NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED', 'REVERSED')),
  reference varchar(120),
  received_by uuid REFERENCES users(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON payments(invoice_id, paid_at);

CREATE TABLE maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  reported_by uuid NOT NULL REFERENCES users(id),
  title varchar(200) NOT NULL,
  description text NOT NULL,
  priority varchar(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  assigned_to uuid REFERENCES users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX maintenance_building_queue_idx ON maintenance_requests(status, priority, created_at);

CREATE TABLE maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES maintenance_requests(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  from_status varchar(20),
  to_status varchar(20) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  building_id uuid REFERENCES buildings(id),
  created_by uuid NOT NULL REFERENCES users(id),
  title varchar(200) NOT NULL,
  content text NOT NULL,
  publish_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_recipients (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  organization_id uuid REFERENCES organizations(id),
  building_id uuid REFERENCES buildings(id),
  action varchar(120) NOT NULL,
  resource_type varchar(100) NOT NULL,
  resource_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_scope_time_idx ON audit_logs(organization_id, building_id, created_at DESC);

INSERT INTO roles (code, name, description) VALUES
  ('SUPER_ADMIN', 'System administrator', 'Platform-wide administration'),
  ('ORG_ADMIN', 'Organization administrator', 'Organization-wide administration'),
  ('BUILDING_MANAGER', 'Building manager', 'Daily building operations'),
  ('MANAGEMENT_STAFF', 'Management staff', 'Building operations staff'),
  ('ACCOUNTANT', 'Accountant', 'Fees, invoices and payment records'),
  ('TECHNICIAN', 'Technical staff', 'Maintenance work'),
  ('SECURITY', 'Security staff', 'Vehicle and security operations'),
  ('BOARD_MEMBER', 'Management board member', 'Oversight and approvals'),
  ('OWNER', 'Apartment owner', 'Owner self-service'),
  ('RESIDENT', 'Resident', 'Resident self-service')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('organization:read', 'Read organization data'),
  ('organization:manage', 'Manage organizations'),
  ('building:read', 'Read buildings'),
  ('building:manage', 'Manage buildings'),
  ('apartment:read', 'Read apartments'),
  ('apartment:manage', 'Manage apartments'),
  ('people:read', 'Read owner and resident records'),
  ('people:manage', 'Manage owner and resident relationships'),
  ('billing:read', 'Read invoices and utility data'),
  ('billing:manage', 'Manage fee and invoice lifecycle'),
  ('payment:record', 'Record or reverse payment'),
  ('maintenance:read', 'Read maintenance requests'),
  ('maintenance:manage', 'Manage maintenance requests'),
  ('notification:read', 'Read notifications'),
  ('notification:manage', 'Publish notifications'),
  ('dashboard:read', 'Read scoped operational dashboard'),
  ('user:manage', 'Manage accounts and role assignments'),
  ('audit:read', 'Read audit history')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'organization:read', 'building:read', 'building:manage', 'apartment:read', 'apartment:manage',
  'people:read', 'people:manage', 'billing:read', 'billing:manage', 'payment:record',
  'maintenance:read', 'maintenance:manage', 'notification:read', 'notification:manage',
  'dashboard:read', 'audit:read'
]) WHERE r.code = 'BUILDING_MANAGER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'organization:read', 'building:read', 'building:manage', 'apartment:read', 'apartment:manage',
  'people:read', 'people:manage', 'billing:read', 'billing:manage', 'payment:record',
  'maintenance:read', 'maintenance:manage', 'notification:read', 'notification:manage',
  'dashboard:read', 'user:manage', 'audit:read'
]) WHERE r.code = 'ORG_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'building:read', 'apartment:read', 'people:read', 'billing:read', 'maintenance:read',
  'maintenance:manage', 'notification:read', 'notification:manage', 'dashboard:read'
]) WHERE r.code = 'MANAGEMENT_STAFF'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'building:read', 'apartment:read', 'people:read', 'billing:read', 'billing:manage',
  'payment:record', 'dashboard:read'
]) WHERE r.code = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'building:read', 'apartment:read', 'maintenance:read', 'maintenance:manage'
]) WHERE r.code = 'TECHNICIAN'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'building:read', 'apartment:read', 'people:read', 'billing:read', 'maintenance:read',
  'notification:read', 'dashboard:read'
]) WHERE r.code = 'BOARD_MEMBER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = ANY(ARRAY[
  'apartment:read', 'billing:read', 'payment:record', 'maintenance:read', 'maintenance:manage',
  'notification:read'
]) WHERE r.code IN ('OWNER', 'RESIDENT')
ON CONFLICT DO NOTHING;
