import type { NextFunction, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { pool } from "../db/pool.js";
import type { AuthenticatedRequest } from "./types.js";

function accessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function issueAccessToken(userId: string) {
  return jwt.sign({}, accessSecret(), {
    subject: userId,
    expiresIn: (process.env.ACCESS_TOKEN_TTL ?? "15m") as jwt.SignOptions["expiresIn"],
    issuer: "smartcondo-api",
    audience: "smartcondo-client",
  });
}

export async function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(authorization.slice(7), accessSecret(), {
      issuer: "smartcondo-api",
      audience: "smartcondo-client",
    }) as JwtPayload;
    if (!decoded.sub) throw new Error("Token subject is missing.");
    userId = decoded.sub;
  } catch {
    response.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Access token is invalid or expired." } });
    return;
  }

  const result = await pool.query(
      `SELECT u.id AS user_id, u.email, r.code AS role,
              ura.organization_id, ura.building_id, p.code AS permission
       FROM users u
       JOIN user_role_assignments ura ON ura.user_id = u.id
       JOIN roles r ON r.id = ura.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1 AND u.status = 'ACTIVE'`,
    [userId],
  );
  if (result.rowCount === 0) {
    response.status(401).json({ success: false, error: { code: "INVALID_SESSION", message: "Account is unavailable." } });
    return;
  }

  const first = result.rows[0];
  request.auth = {
    userId: first.user_id,
    email: first.email,
    scopes: result.rows.map((row) => ({
      role: row.role,
      organizationId: row.organization_id,
      buildingId: row.building_id,
    })),
    permissions: new Set(result.rows.flatMap((row) => row.permission ? [row.permission] : [])),
  };
  next();
}

export function requirePermission(permission: string) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.auth) {
      response.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
      return;
    }
    if (!request.auth.permissions.has(permission)) {
      response.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Permission denied." } });
      return;
    }
    next();
  };
}

export function canAccessOrganization(auth: NonNullable<AuthenticatedRequest["auth"]>, organizationId: string) {
  return auth.scopes.some((scope) => scope.organizationId === organizationId || scope.role === "SUPER_ADMIN");
}

export function canAccessBuilding(auth: NonNullable<AuthenticatedRequest["auth"]>, buildingId: string) {
  return auth.scopes.some((scope) => scope.buildingId === buildingId || scope.role === "SUPER_ADMIN");
}

export function requireAccessSecret() {
  accessSecret();
}
