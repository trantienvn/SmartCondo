ALTER TABLE payments ADD COLUMN idempotency_key varchar(100);
CREATE UNIQUE INDEX payments_idempotency_key_unique
  ON payments (invoice_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

INSERT INTO permissions (code, description) VALUES
  ('utility:read', 'Read utility meter data'),
  ('utility:manage', 'Record utility meter readings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'utility:read'
WHERE r.code IN ('SUPER_ADMIN', 'ORG_ADMIN', 'BUILDING_MANAGER', 'MANAGEMENT_STAFF', 'ACCOUNTANT', 'BOARD_MEMBER', 'OWNER', 'RESIDENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'utility:manage'
WHERE r.code IN ('SUPER_ADMIN', 'ORG_ADMIN', 'BUILDING_MANAGER', 'MANAGEMENT_STAFF')
ON CONFLICT DO NOTHING;
