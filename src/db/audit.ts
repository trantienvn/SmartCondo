import type { PoolClient } from "pg";

type AuditEntry = {
  actorId?: string | null;
  organizationId?: string | null;
  buildingId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
};

export async function writeAudit(client: PoolClient, entry: AuditEntry) {
  await client.query(
    `INSERT INTO audit_logs (actor_id, organization_id, building_id, action, resource_type, resource_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [entry.actorId ?? null, entry.organizationId ?? null, entry.buildingId ?? null, entry.action, entry.resourceType, entry.resourceId ?? null, JSON.stringify(entry.details ?? {})],
  );
}
