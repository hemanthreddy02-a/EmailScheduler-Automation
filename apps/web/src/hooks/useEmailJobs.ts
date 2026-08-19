import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailApi, senderApi, authApi } from "../services/api.js";
import type { ScheduleEmailInput } from "../types/index.js";

export const QUERY_KEYS = {
  user: ["user"],
  scheduled: ["emails", "scheduled"],
  sent: ["emails", "sent"],
  stats: ["emails", "stats"],
  senders: ["senders"],
};

export function useCurrentUser() {
  return useQuery({
    queryKey: QUERY_KEYS.user,
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduledEmails(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...QUERY_KEYS.scheduled, page, limit],
    queryFn: () => emailApi.getScheduled(page, limit),
    refetchInterval: 3000, // Auto refresh every 3s to see jobs process
  });
}

export function useSentEmails(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sent, page, limit],
    queryFn: () => emailApi.getSent(page, limit),
    refetchInterval: 5000,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: emailApi.getStats,
    refetchInterval: 3000,
  });
}

export function useSenders() {
  return useQuery({
    queryKey: QUERY_KEYS.senders,
    queryFn: senderApi.getSenders,
  });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScheduleEmailInput) => emailApi.scheduleEmails(input),
    onSuccess: () => {
      // Invalidate queries so lists refresh immediately
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scheduled });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
  });
}
