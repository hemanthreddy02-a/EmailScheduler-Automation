/**
 * Authentication middleware.
 *
 * requireAuth: Protects API routes — returns 401 if not authenticated.
 *
 * Session-based auth with HTTP-only cookies via express-session + Passport.
 * Tokens are never stored in localStorage.
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
    return;
  }
  next();
}

/**
 * Type-safe wrapper for authenticated route handlers.
 * Use after requireAuth to get proper typing on req.user.
 */
export function asAuthenticatedRequest(
  handler: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => void | Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as AuthenticatedRequest, res, next);
  };
}
