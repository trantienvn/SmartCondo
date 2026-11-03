import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { authenticate, issueAccessToken } from "./auth.js";
import type { AuthenticatedRequest } from "./types.js";

const router = Router();
const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

router.post("/login", async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!email || !password || bcrypt.truncates(password)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required." } });
    return;
  }

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.status, p.full_name
     FROM users u LEFT JOIN people p ON p.id = u.person_id
     WHERE lower(u.email) = $1`,
    [email],
  );
  const user = userResult.rows[0];
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(password, user.password_hash))) {
    response.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    return;
  }

  const scopeResult = await pool.query(
    `SELECT r.code AS role, ura.organization_id, ura.building_id,
            COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::text[]) AS permissions
     FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE ura.user_id = $1
     GROUP BY r.code, ura.organization_id, ura.building_id`,
    [user.id],
  );
  if (scopeResult.rowCount === 0) {
    response.status(403).json({ success: false, error: { code: "NO_ROLE_ASSIGNMENT", message: "Account has no assigned access scope." } });
    return;
  }

  const refreshToken = randomBytes(48).toString("base64url");
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 day'))`,
    [user.id, digest(refreshToken), refreshDays],
  );

  response.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, fullName: user.full_name },
      scopes: scopeResult.rows.map(({ role, organization_id, building_id }) => ({ role, organization_id, building_id })),
      permissions: [...new Set(scopeResult.rows.flatMap((scope) => scope.permissions as string[]))],
      accessToken: issueAccessToken(user.id),
      refreshToken,
      tokenType: "Bearer",
      expiresIn: process.env.ACCESS_TOKEN_TTL ?? "15m",
    },
  });
});

router.post("/refresh", async (request, response) => {
  const token = typeof request.body?.refreshToken === "string" ? request.body.refreshToken : "";
  if (!token) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "refreshToken is required." } });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT rt.id, rt.user_id FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now() AND u.status = 'ACTIVE'
       FOR UPDATE OF rt`,
      [digest(token)],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      response.status(401).json({ success: false, error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or expired." } });
      return;
    }

    const userId = current.rows[0].user_id as string;
    const nextToken = randomBytes(48).toString("base64url");
    await client.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [current.rows[0].id]);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 day'))`,
      [userId, digest(nextToken), refreshDays],
    );
    await client.query("COMMIT");
    response.json({ success: true, data: { accessToken: issueAccessToken(userId), refreshToken: nextToken, tokenType: "Bearer", expiresIn: process.env.ACCESS_TOKEN_TTL ?? "15m" } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/logout", authenticate, async (request, response) => {
  const authRequest = request as AuthenticatedRequest;
  await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [authRequest.auth!.userId]);
  response.status(204).end();
});

export default router;
