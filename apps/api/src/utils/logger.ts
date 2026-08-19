/**
 * Structured logger using Pino.
 *
 * In development: pretty-prints with colors.
 * In production: emits structured JSON.
 *
 * IMPORTANT: Never log secrets (passwords, session keys, OAuth tokens).
 */

import pino from "pino";
import { config } from "../config/index.js";

export const logger = pino({
  level: config.nodeEnv === "test" ? "silent" : "info",
  ...(config.nodeEnv === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;
