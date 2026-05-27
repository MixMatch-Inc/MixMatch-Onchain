import cors from "cors";
import express from "express";
import helmet from "helmet";

import type { ApiHealthResponse } from "@themixmatch/types";

export function createApiApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    const payload: ApiHealthResponse = {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    };

    response.json(payload);
  });

  app.get("/api/v1", (_request, response) => {
    response.json({
      name: "TheMixMatch API starter",
      milestone: "Authentication",
      nextStep: "Add auth routes, session storage, and shared contracts."
    });
  });

  return app;
}
