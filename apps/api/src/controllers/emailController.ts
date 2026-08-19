/**
 * Email controller — thin layer delegating to services.
 * Business logic lives in schedulerService, not here.
 */

import type { Request, Response, NextFunction } from "express";
import { EmailJobStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  scheduleEmails,
  scheduleEmailSchema,
} from "../services/schedulerService.js";
import { getQueueStats } from "../queues/emailQueue.js";
import { logger } from "../utils/logger.js";
import type { AuthenticatedRequest } from "../types/index.js";

export const emailController = {
  /**
   * POST /api/emails/schedule
   */
  async schedule(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const input = scheduleEmailSchema.parse(req.body);

      const result = await scheduleEmails(userId, input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "SENDER_NOT_FOUND") {
        res.status(403).json({
          success: false,
          error: {
            code: "SENDER_NOT_FOUND",
            message: "Sender not found or does not belong to you",
          },
        });
        return;
      }
      next(err);
    }
  },

  /**
   * GET /api/emails/scheduled
   * Returns SCHEDULED and PROCESSING jobs for the authenticated user.
   */
  async getScheduled(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const page = parseInt(String(req.query.page ?? "1"), 10);
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.emailJob.findMany({
          where: {
            userId,
            status: { in: [EmailJobStatus.SCHEDULED, EmailJobStatus.PROCESSING] },
          },
          orderBy: { scheduledAt: "asc" },
          skip,
          take: limit,
          select: {
            id: true,
            recipient: true,
            subject: true,
            scheduledAt: true,
            status: true,
            attempts: true,
            batchId: true,
            createdAt: true,
          },
        }),
        prisma.emailJob.count({
          where: {
            userId,
            status: { in: [EmailJobStatus.SCHEDULED, EmailJobStatus.PROCESSING] },
          },
        }),
      ]);

      res.json({
        success: true,
        data: { jobs, total, page, limit },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/emails/sent
   * Returns SENT and FAILED jobs for the authenticated user.
   */
  async getSent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const page = parseInt(String(req.query.page ?? "1"), 10);
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.emailJob.findMany({
          where: {
            userId,
            status: { in: [EmailJobStatus.SENT, EmailJobStatus.FAILED] },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            recipient: true,
            subject: true,
            sentAt: true,
            status: true,
            attempts: true,
            errorMessage: true,
            batchId: true,
            updatedAt: true,
          },
        }),
        prisma.emailJob.count({
          where: {
            userId,
            status: { in: [EmailJobStatus.SENT, EmailJobStatus.FAILED] },
          },
        }),
      ]);

      res.json({
        success: true,
        data: { jobs, total, page, limit },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/emails/:id
   * Returns a single email job — enforces user ownership.
   */
  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const jobId = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;

      const job = await prisma.emailJob.findFirst({
        where: { id: jobId, userId }, // userId enforces ownership
        include: { sender: { select: { email: true } } },
      });

      if (!job) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Email job not found" },
        });
        return;
      }

      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/emails/stats
   * Dashboard summary counts.
   */
  async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user.id;

      const [scheduled, processing, sent, failed, queueStats] = await Promise.all([
        prisma.emailJob.count({
          where: { userId, status: EmailJobStatus.SCHEDULED },
        }),
        prisma.emailJob.count({
          where: { userId, status: EmailJobStatus.PROCESSING },
        }),
        prisma.emailJob.count({
          where: { userId, status: EmailJobStatus.SENT },
        }),
        prisma.emailJob.count({
          where: { userId, status: EmailJobStatus.FAILED },
        }),
        getQueueStats(),
      ]);

      res.json({
        success: true,
        data: {
          db: { scheduled, processing, sent, failed },
          queue: queueStats,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
