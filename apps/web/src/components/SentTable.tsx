import React from "react";
import { Badge } from "./ui/Badge.js";
import { TableSkeleton, EmptyState } from "./ui/EmptyState.js";
import type { EmailJob } from "../types/index.js";

interface SentTableProps {
  jobs?: EmailJob[];
  isLoading: boolean;
  onComposeClick: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  jobs,
  isLoading,
  onComposeClick,
}) => {
  if (isLoading) return <TableSkeleton />;

  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        title="No sent emails yet"
        description="Completed email sends and delivery attempts will appear here."
        actionLabel="+ Compose New Email"
        onAction={onComposeClick}
      />
    );
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Recipient Email</th>
              <th className="py-3.5 px-6">Subject</th>
              <th className="py-3.5 px-6">Sent Time</th>
              <th className="py-3.5 px-6">Attempts</th>
              <th className="py-3.5 px-6">Error Log</th>
              <th className="py-3.5 px-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-4 px-6 font-medium text-gray-900">
                  {job.recipient}
                </td>
                <td className="py-4 px-6 text-gray-600 max-w-xs truncate">
                  {job.subject}
                </td>
                <td className="py-4 px-6 text-gray-500 text-xs font-mono">
                  {formatDate(job.sentAt || job.updatedAt)}
                </td>
                <td className="py-4 px-6 text-gray-500 text-xs">
                  {job.attempts}
                </td>
                <td className="py-4 px-6 text-xs max-w-xs truncate">
                  {job.errorMessage ? (
                    <span className="text-rose-600 font-mono" title={job.errorMessage}>
                      {job.errorMessage}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  <Badge status={job.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
