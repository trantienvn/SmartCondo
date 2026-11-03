INSERT INTO permissions (code, description) VALUES
  ('maintenance:submit', 'Submit a maintenance request for an authorized apartment')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'maintenance:submit'
WHERE r.code IN ('OWNER', 'RESIDENT')
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp USING roles r, permissions p
WHERE rp.role_id = r.id AND rp.permission_id = p.id
  AND r.code IN ('OWNER', 'RESIDENT') AND p.code = 'maintenance:manage';
