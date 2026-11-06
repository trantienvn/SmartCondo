import express from "express";
import { randomUUID } from "node:crypto";
import { pool } from "./db/pool.js";
import authRoutes from "./auth/routes.js";
import coreRoutes from "./modules/core.routes.js";
import adminRoutes from "./modules/admin.routes.js";
import peopleRoutes from "./modules/people.routes.js";
import billingRoutes from "./modules/billing.routes.js";
import operationsRoutes from "./modules/operations.routes.js";

export function createApp() {
  const app = express();
  const basePath = process.env.API_BASE_PATH ?? "/api/v1";

  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("x-request-id", randomUUID());
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "no-referrer");
    const origin = _request.header("origin");
    const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
      .split(",").map((value) => value.trim()).filter(Boolean));
    if (origin && allowedOrigins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "Origin");
      response.setHeader("access-control-allow-methods", "GET,POST,PATCH,OPTIONS");
      response.setHeader("access-control-allow-headers", "Authorization,Content-Type,Idempotency-Key");
    }
    if (_request.method === "OPTIONS") {
      response.status(origin && !allowedOrigins.has(origin) ? 403 : 204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get(`${basePath}/health`, async (_request, response) => {
    await pool.query("SELECT 1");
    response.status(200).json({ success: true, data: { status: "healthy", dependencies: { database: "connected" }, timestamp: new Date().toISOString() } });
  });

  app.post(`${basePath}/demo/seed`, async (_request, response) => {
    try {
      const { runSeed } = await import("./db/seed.js");
      await runSeed();
      response.status(200).json({ success: true, data: { message: "Demo data seeded successfully." } });
    } catch (error) {
      console.error("Demo seed error:", error);
      response.status(500).json({ success: false, error: { code: "SEED_ERROR", message: (error as Error).message } });
    }
  });

  app.use(`${basePath}/auth`, authRoutes);
  app.use(basePath, coreRoutes);
  app.use(basePath, adminRoutes);
  app.use(basePath, peopleRoutes);
  app.use(basePath, billingRoutes);
  app.use(basePath, operationsRoutes);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found." },
    });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
    if (status === 400) {
      response.status(400).json({ success: false, error: { code: "INVALID_REQUEST", message: "Request body is invalid." } });
      return;
    }
    console.error("Unhandled request error", error);
    const databaseCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (["23505", "23503", "23514"].includes(databaseCode)) {
      response.status(databaseCode === "23514" ? 400 : 409).json({
        success: false,
        error: { code: databaseCode === "23514" ? "CONSTRAINT_VIOLATION" : "DATA_CONFLICT", message: "The request conflicts with existing or required data." },
      });
      return;
    }
    response.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
  });

  return app;
}
