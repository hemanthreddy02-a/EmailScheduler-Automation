/**
 * Express application setup.
 *
 * Configures:
 *  - Security (Helmet, CORS)
 *  - Session (Redis-backed HTTP-only cookies)
 *  - Passport (Google OAuth strategy)
 *  - Request parsing
 *  - Routes
 *  - Error handling
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import { createClient } from "redis";
import RedisStore from "connect-redis";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./config/index.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./utils/logger.js";
import { authRouter } from "./routes/auth.js";
import { emailRouter } from "./routes/emails.js";
import { senderRouter } from "./routes/senders.js";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { User as PrismaUser } from "@prisma/client";

// ─── Passport Session Types ───────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends PrismaUser {}
  }
}

export async function createApp(): Promise<express.Express> {
  const app = express();

  // ─── Security ───────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow dev tools
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true, // Required for cookies
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ─── Request Parsing ─────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Session (Redis-backed) ───────────────────────────────────────────────
  // Using connect-redis v7 with ioredis-compatible client
  const redisClient = createClient({ url: config.redis.url });
  
  redisClient.on("error", (err: unknown) => {
    logger.error({ err }, "Session Redis client error");
  });

  await redisClient.connect();

  const store = new RedisStore({ client: redisClient });

  app.use(
    session({
      store,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,                          // Never accessible from JS
        secure: config.isProduction,             // HTTPS only in prod
        sameSite: config.isProduction ? "strict" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,        // 7 days
      },
    })
  );

  // ─── Passport ─────────────────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error("No email returned from Google"));
            return;
          }

          // Find or create user
          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value ?? null,
            },
            create: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatarUrl: profile.photos?.[0]?.value ?? null,
            },
          });

          logger.info({ userId: user.id, email }, "User authenticated via Google");
          done(null, user);
        } catch (err) {
          logger.error({ err }, "Google OAuth strategy error");
          done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, (user as PrismaUser).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user ?? false);
    } catch (err) {
      done(err);
    }
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/emails", emailRouter);
  app.use("/api/senders", senderRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
