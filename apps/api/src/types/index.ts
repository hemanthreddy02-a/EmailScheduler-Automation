/**
 * Shared TypeScript types for the API.
 */

import { Request } from "express";
import { User } from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: User;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Email Scheduling ─────────────────────────────────────────────────────────

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string; // ISO 8601
  delayMs: number;
  hourlyLimit: number;
  senderId: string;
}

export interface ScheduleEmailResponse {
  batchId: string;
  total: number;
  scheduled: number;
}

// ─── BullMQ Job Payload ───────────────────────────────────────────────────────

export interface EmailJobPayload {
  emailJobId: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
}

// ─── Sender (safe for frontend) ───────────────────────────────────────────────

export interface SenderPublic {
  id: string;
  email: string;
  createdAt: Date;
}
