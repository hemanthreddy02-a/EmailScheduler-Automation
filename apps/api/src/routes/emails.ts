import { Router } from "express";
import { emailController } from "../controllers/emailController.js";
import { requireAuth } from "../middleware/auth.js";

const router: Router = Router();

// All email routes require authentication
router.use(requireAuth);

/** POST /api/emails/schedule */
router.post("/schedule", emailController.schedule);

/** GET /api/emails/stats */
router.get("/stats", emailController.getStats);

/** GET /api/emails/scheduled */
router.get("/scheduled", emailController.getScheduled);

/** GET /api/emails/sent */
router.get("/sent", emailController.getSent);

/** GET /api/emails/:id */
router.get("/:id", emailController.getById);

export { router as emailRouter };
