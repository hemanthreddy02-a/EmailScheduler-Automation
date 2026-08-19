/**
 * Centralized configuration module.
 *
 * Reads all settings from environment variables and validates them at startup.
 * The application fails fast with a clear error message if required config is missing.
 */

import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the repo root (two levels up from apps/api/src/config)
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const configSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url("GOOGLE_CALLBACK_URL must be a valid URL"),

  // Session
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),

  // Ethereal SMTP
  ETHEREAL_HOST: z.string().default("smtp.ethereal.email"),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().min(1).default(10),
  MIN_EMAIL_DELAY_MS: z.coerce.number().min(0).default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().min(1).default(100),

  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

function loadConfig() {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  const envWithDefaults = {
    DATABASE_URL: "postgresql://reachinbox:reachinbox@localhost:5432/reachinbox",
    REDIS_URL: "redis://localhost:6379",
    GOOGLE_CLIENT_ID: "test_client_id",
    GOOGLE_CLIENT_SECRET: "test_client_secret",
    GOOGLE_CALLBACK_URL: "http://localhost:4000/auth/google/callback",
    SESSION_SECRET: "test_session_secret_key_minimum_32_characters",
    ...process.env,
  };

  const result = configSchema.safeParse(isTest ? envWithDefaults : process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `\n❌ Invalid configuration — check your .env file:\n${missing}\n`
    );
    process.exit(1);
  }

  return result.data;
}

const env = loadConfig();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isProduction: env.NODE_ENV === "production",

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  },

  session: {
    secret: env.SESSION_SECRET,
  },

  ethereal: {
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    user: env.ETHEREAL_USER,
    password: env.ETHEREAL_PASSWORD,
  },

  worker: {
    concurrency: env.WORKER_CONCURRENCY,
    minEmailDelayMs: env.MIN_EMAIL_DELAY_MS,
    maxEmailsPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  },

  frontendUrl: env.FRONTEND_URL,
} as const;

export type Config = typeof config;
