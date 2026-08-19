export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Sender {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: string;
}

export type EmailJobStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailJobStatus;
  attempts: number;
  errorMessage?: string | null;
  batchId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleEmailInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  senderId: string;
}

export interface ScheduleEmailResponse {
  batchId: string;
  total: number;
  scheduled: number;
}

export interface DashboardStats {
  db: {
    scheduled: number;
    processing: number;
    sent: number;
    failed: number;
  };
  queue?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

export interface PaginatedResponse<T> {
  jobs: T[];
  total: number;
  page: number;
  limit: number;
}
