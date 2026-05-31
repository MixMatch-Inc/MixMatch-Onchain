import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";

import type { ApiHealthResponse } from "@themixmatch/types";
import { signupHandler } from "./domains/identity/signup.handler.js";
import { stellarHandshakeHandler } from "./domains/identity/stellar.handler.js";
import { sendError } from "./utils/api-response.js";

export function createApiApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request: Request, response: Response) => {
    const payload: ApiHealthResponse = {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    };

    response.json(payload);
  });

  app.get("/api/v1", (_request: Request, response: Response) => {
    response.json({
      name: "TheMixMatch API starter",
      milestone: "Authentication",
      nextStep: "Add auth routes, session storage, and shared contracts."
    });
  });

  app.post("/api/v1/auth/register", signupHandler);
  app.get("/api/v1/auth/handshake", stellarHandshakeHandler);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === "object" && "code" in err && "message" in err && "statusCode" in err) {
      sendError(res, err as { code: string; message: string; statusCode: number });
    } else {
      sendError(res, { code: "INTERNAL_ERROR", message: "An unexpected error occurred", statusCode: 500 });
    }
  });

  return app;
}
