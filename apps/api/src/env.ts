import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

// Carga el .env de la raíz del monorepo (fuente única de configuración).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(root, ".env") });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(20, "JWT_SECRET debe tener al menos 20 caracteres"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
