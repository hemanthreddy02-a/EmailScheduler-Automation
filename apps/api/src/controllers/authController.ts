/**
 * Auth controller — handles Google OAuth callback, me, and logout.
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const authController = {
  /**
   * GET /api/auth/me
   * Returns the authenticated user's profile (safe fields only).
   */
  me(req: Request, res: Response): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
      return;
    }

    const user = req.user as AuthenticatedRequest["user"];
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  },

  /**
   * POST /auth/logout
   */
  logout(req: Request, res: Response, next: NextFunction): void {
    const userId = (req.user as AuthenticatedRequest["user"] | undefined)?.id;

    req.logout((err) => {
      if (err) {
        next(err);
        return;
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          logger.warn({ sessionErr }, "Session destroy error");
        }

        res.clearCookie("connect.sid");
        logger.info({ userId }, "User logged out");

        res.json({ success: true, data: { message: "Logged out successfully" } });
      });
    });
  },

  /**
   * Called after successful Google OAuth.
   * Redirects to the frontend dashboard.
   */
  googleCallback(req: Request, res: Response): void {
    logger.info(
      { userId: (req.user as AuthenticatedRequest["user"])?.id },
      "Google OAuth callback successful"
    );
    res.redirect(`${process.env.FRONTEND_URL ?? "http://localhost:5173"}/dashboard`);
  },

  /**
   * Called on OAuth failure.
   */
  googleCallbackFailure(req: Request, res: Response): void {
    logger.warn("Google OAuth callback failed");
    res.redirect(
      `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/login?error=oauth_failed`
    );
  },
};
