import express from "express";
import cors from "cors";
import { createResourceRouter } from "./routes/factory.js";
import { resources } from "./validation/resources.js";
import { HttpError, notFound } from "./utils/httpError.js";

export function createApp() {
  const app = express();

  const allowed = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowed.includes("*") ? true : allowed,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  for (const [name, config] of Object.entries(resources)) {
    app.use(`/${name}`, createResourceRouter(name, config));
  }

  // Keep the catch-all last so it cannot shadow the routes above.
  app.use((_req, _res, next) => next(notFound()));

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }

    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON in request body" });
    }

    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
