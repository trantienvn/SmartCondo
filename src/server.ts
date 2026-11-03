import "dotenv/config";
import { createApp } from "./app.js";
import { requireAccessSecret } from "./auth/auth.js";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

requireAccessSecret();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

createApp().listen(port, host, () => {
  console.info(`SmartCondo API listening at http://${host}:${port}`);
});
