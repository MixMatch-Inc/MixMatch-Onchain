import cors from "cors";
import express from "express";
import helmet from "helmet";

import type {
  ApiHealthResponse,
  AuthContractCatalogResponse
} from "@themixmatch/types";

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

  app.get("/api/v1/auth/contracts", (_request, response) => {
    const payload: AuthContractCatalogResponse = {
      milestone: "Authentication",
      version: "0.1.0",
      flows: [
        {
          flow: "email-verification",
          requestType: "EmailVerificationRequest",
          responseType: "EmailVerificationResponse",
          owner: "apps/api"
        },
        {
          flow: "password-recovery",
          requestType: "PasswordRecoveryRequest",
          responseType: "PasswordRecoveryResponse",
          owner: "apps/api"
        },
        {
          flow: "ownership-proof",
          requestType: "OwnershipProofChallengeRequest",
          responseType: "OwnershipProofChallengeResponse",
          owner: "apps/api"
        }
      ]
    };

    response.json(payload);
  });

  return app;
}
