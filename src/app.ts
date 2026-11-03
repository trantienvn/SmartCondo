import express from "express";

export function createApp() {
  const app = express();
  const basePath = process.env.API_BASE_PATH ?? "/api/v1";

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get(`${basePath}/health`, (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found." },
    });
  });

  return app;
}
