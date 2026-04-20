/**
 * Media service Express entry point.
 */
import express, { type Application } from "express";
import { initTelemetry, shutdownTelemetry } from "./telemetry/index.js";
import { config } from "./config.js";
import { jobsRouter } from "./routes/jobs.js";

// Initialize OTel before anything else
initTelemetry();

const app: Application = express();

app.use(express.json({ limit: "2mb" }));

// Routes
app.use(jobsRouter);

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "media", env: config.NODE_ENV });
});

const server = app.listen(config.PORT, () => {
  console.log(`[media] Server listening on port ${config.PORT} (${config.NODE_ENV})`);
});

async function shutdown(): Promise<void> {
  console.log("[media] Shutting down...");
  server.close(() => {
    console.log("[media] HTTP server closed");
  });
  await shutdownTelemetry();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

export default app;
