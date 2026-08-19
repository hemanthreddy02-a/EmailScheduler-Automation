import { Router } from "express";
import passport from "passport";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { config } from "../config/index.js";

const router: Router = Router();

/**
 * GET /auth/google
 * Initiates Google OAuth flow.
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * GET /auth/google/callback
 * Handles Google OAuth callback.
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google/callback/failure",
  }),
  authController.googleCallback
);

router.get("/google/callback/failure", authController.googleCallbackFailure);

/**
 * POST /auth/logout
 */
router.post("/logout", authController.logout);

/**
 * GET /api/auth/me
 * Returns authenticated user profile.
 */
router.get("/me", requireAuth, authController.me);

/**
 * GET /auth/dev-login
 * DEV ONLY: Instantly logs in the seeded dev user without Google OAuth.
 * Only available when NODE_ENV=development.
 */
router.get("/dev-login", async (req, res, next) => {
  if (config.isProduction) {
    res.status(404).json({ success: false, error: { message: "Not found" } });
    return;
  }

  try {
    const devUser = await prisma.user.findUnique({
      where: { email: "dev@reachinbox.local" },
    });

    if (!devUser) {
      res.status(404).json({
        success: false,
        error: { message: "Dev user not found. Run: pnpm db:seed" },
      });
      return;
    }

    req.login(devUser, (err) => {
      if (err) {
        next(err);
        return;
      }
      res.redirect(`${config.frontendUrl}/dashboard`);
    });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
