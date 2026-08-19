import axios from "axios";
import type {
  User,
  Sender,
  EmailJob,
  ScheduleEmailInput,
  ScheduleEmailResponse,
  DashboardStats,
  PaginatedResponse,
} from "../types/index.js";

const api = axios.create({
  baseURL: "/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authApi = {
  async getCurrentUser(): Promise<User> {
    const res = await api.get<{ success: boolean; data: User }>("/api/auth/me");
    return res.data.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  getGoogleLoginUrl(): string {
    return "/auth/google";
  },
};

export const emailApi = {
  async scheduleEmails(input: ScheduleEmailInput): Promise<ScheduleEmailResponse> {
    const res = await api.post<{ success: boolean; data: ScheduleEmailResponse }>(
      "/api/emails/schedule",
      input
    );
    return res.data.data;
  },

  async getScheduled(page = 1, limit = 50): Promise<PaginatedResponse<EmailJob>> {
    const res = await api.get<{ success: boolean; data: PaginatedResponse<EmailJob> }>(
      `/api/emails/scheduled?page=${page}&limit=${limit}`
    );
    return res.data.data;
  },

  async getSent(page = 1, limit = 50): Promise<PaginatedResponse<EmailJob>> {
    const res = await api.get<{ success: boolean; data: PaginatedResponse<EmailJob> }>(
      `/api/emails/sent?page=${page}&limit=${limit}`
    );
    return res.data.data;
  },

  async getStats(): Promise<DashboardStats> {
    const res = await api.get<{ success: boolean; data: DashboardStats }>(
      "/api/emails/stats"
    );
    return res.data.data;
  },
};

export const senderApi = {
  async getSenders(): Promise<Sender[]> {
    const res = await api.get<{ success: boolean; data: Sender[] }>("/api/senders");
    return res.data.data;
  },
};
