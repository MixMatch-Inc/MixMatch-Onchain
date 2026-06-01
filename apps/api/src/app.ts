import cors from "cors";
import express, { type Application, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";

import type { ApiHealthResponse } from "@themixmatch/types";
import { loginHandler } from "./domains/identity/login.handler.js";
import { signupHandler } from "./domains/identity/signup.handler.js";
import { stellarAuthVerifyHandler, stellarAuthChallengeHandler } from "./domains/identity/stellar-auth.handler.js";
import { refreshHandler, introspectHandler, validateHandler, logoutHandler } from "./domains/identity/session.handler.js";
import { stellarHandshakeHandler } from "./domains/identity/stellar.handler.js";
import { requireAuth } from "./middleware/require-auth.js";
import { sendError } from "./utils/api-response.js";

export function createApiApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get("/health", (_request: Request, response: Response) => {
    const payload: ApiHealthResponse = {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
    response.json(payload);
  });

  app.get("/api/v1", (_request: Request, response: Response) => {
    response.json({
      name: "TheMixMatch API",
      milestone: "Authentication",
      routes: {
        register: "POST /api/v1/auth/register",
        login: "POST /api/v1/auth/login",
        refresh: "POST /api/v1/auth/refresh",
        introspect: "GET /api/v1/auth/introspect",
        validate: "POST /api/v1/auth/validate",
        logout: "POST /api/v1/auth/logout",
        handshake: "GET /api/v1/auth/handshake",
      },
    });
  });

  // ── Auth — public ───────────────────────────────────────────────────────────
  app.post("/api/v1/auth/register", signupHandler);
  app.post("/api/v1/auth/login", loginHandler);
  app.post("/api/v1/auth/refresh", refreshHandler);
  app.post("/api/v1/auth/validate", validateHandler);
  app.post("/api/v1/auth/logout", logoutHandler);
  app.get("/api/v1/auth/handshake", stellarHandshakeHandler);

  // Stellar-boundary auth routes (auth-to-Stellar handoff)
  app.post("/api/v1/stellar/auth/challenge", stellarAuthChallengeHandler);
  app.post("/api/v1/stellar/auth/verify", stellarAuthVerifyHandler);

  // ── Auth — protected (requires valid access token) ──────────────────────────
  app.get("/api/v1/auth/introspect", requireAuth, introspectHandler);

  // ── Global error handler ────────────────────────────────────────────────────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === "object" && "code" in err && "message" in err && "statusCode" in err) {
      sendError(res, err as { code: string; message: string; statusCode: number });
    } else {
      sendError(res, { code: "INTERNAL_ERROR", message: "An unexpected error occurred", statusCode: 500 });
    }
  });

  return app;
}