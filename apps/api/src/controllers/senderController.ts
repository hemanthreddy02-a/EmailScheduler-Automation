/**
 * Sender controller.
 *
 * SECURITY: SMTP passwords are never included in responses.
 * The SenderPublic type explicitly omits smtpPassword and other credentials.
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import type { AuthenticatedRequest } from "../types/index.js";

const createSenderSchema = z.object({
  email: z.string().email("Invalid sender email"),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
});

export const senderController = {
  /**
   * GET /api/senders
   * Returns senders belonging to the authenticated user.
   * SMTP password is deliberately excluded.
   */
  async getSenders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;

      const senders = await prisma.sender.findMany({
        where: { userId },
        select: {
          id: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          createdAt: true,
          // smtpPassword deliberately excluded
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({ success: true, data: senders });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/senders
   */
  async createSender(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const input = createSenderSchema.parse(req.body);

      const sender = await prisma.sender.create({
        data: {
          userId,
          email: input.email,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
          smtpUser: input.smtpUser,
          smtpPassword: input.smtpPassword,
        },
        select: {
          id: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          createdAt: true,
          // smtpPassword excluded
        },
      });

      res.status(201).json({ success: true, data: sender });
    } catch (err) {
      next(err);
    }
  },
};
