import { Router } from "express";
import { senderController } from "../controllers/senderController.js";
import { requireAuth } from "../middleware/auth.js";

const router: Router = Router();

router.use(requireAuth);

/** GET /api/senders */
router.get("/", senderController.getSenders);

/** POST /api/senders */
router.post("/", senderController.createSender);

export { router as senderRouter };
