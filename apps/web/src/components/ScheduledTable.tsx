import React from "react";
import { Badge } from "./ui/Badge.js";
import { TableSkeleton, EmptyState } from "./ui/EmptyState.js";
import type { EmailJob } from "../types/index.js";

interface ScheduledTableProps {
  jobs?: EmailJob[];
  isLoading: boolean;
  onComposeClick: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  jobs,
  isLoading,
  onComposeClick,
}) => {
  if (isLoading) return <TableSkeleton />;

  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        title="No scheduled emails"
        description="Your upcoming email campaigns will appear here once scheduled."
        actionLabel="+ Compose New Email"
        onAction={onComposeClick}
      />
    );
  }

  const formatDate = (dateStr: string) => {
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
              <th className="py-3.5 px-6">Scheduled Time</th>
              <th className="py-3.5 px-6">Attempts</th>
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
                  {formatDate(job.scheduledAt)}
                </td>
                <td className="py-4 px-6 text-gray-500 text-xs">
                  {job.attempts}
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
