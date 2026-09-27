import express from "express";
import cors from "cors";
import { createResourceRouter } from "./routes/factory.js";
import { resources } from "./validation/resources.js";
import authRoutes from "./routes/auth.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import followUpsRoutes from "./routes/followUps.routes.js";
import { requireAuth } from "./auth/requireAuth.js";
import { config } from "./config.js";
import { ping } from "./db/migrate.js";
import { HttpError, notFound } from "./utils/httpError.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin.includes("*") ? true : config.corsOrigin,
    }),
  );
  app.use(express.json());

  // Reports whether the API is up *and* whether it can reach PostgreSQL, so a
  // deployment that started but cannot talk to the database is visibly broken
  // rather than silently 500ing on every request.
  app.get("/health", async (_req, res) => {
    try {
      await ping();
      res.json({ status: "ok", database: "up" });
    } catch {
      res.status(503).json({ status: "degraded", database: "down" });
    }
  });

  app.use("/auth", authRoutes);

  // Notes and follow-ups hang off a customer or a deal, and inherit its access
  // rules, so they get their own routers rather than the resource factory.
  app.use("/notes", notesRoutes);
  app.use("/followups", followUpsRoutes);

  // Every CRM collection sits behind requireAuth. This is the guard that makes
  // the API useless to anyone without a valid token, regardless of whether they
  // know the URL.
  for (const [name, resource] of Object.entries(resources)) {
    app.use(`/${name}`, requireAuth, createResourceRouter(name, resource));
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
