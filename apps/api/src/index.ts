import dotenv from "dotenv";
import { z } from "zod";

import { createApiApp } from "./app.js";

dotenv.config();

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3001)
});

const env = envSchema.parse(process.env);
const app = createApiApp();

app.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});
