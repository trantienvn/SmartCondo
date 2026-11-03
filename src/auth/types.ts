import type { Request } from "express";

export type AccessScope = {
  role: string;
  organizationId: string | null;
  buildingId: string | null;
};

export type AuthContext = {
  userId: string;
  email: string;
  scopes: AccessScope[];
  permissions: Set<string>;
};

export type AuthenticatedRequest = Request & { auth?: AuthContext };
