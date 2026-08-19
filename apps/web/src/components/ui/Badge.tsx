import React from "react";
import type { EmailJobStatus } from "../../types/index.js";

interface BadgeProps {
  status: EmailJobStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = "" }) => {
  const upper = status.toUpperCase();

  const styles: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10",
    PROCESSING: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10 animate-pulse",
    SENT: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
    FAILED: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10",
  };

  const currentStyle =
    styles[upper] || "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/10";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ring-1 ring-inset ${currentStyle} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          upper === "SENT"
            ? "bg-emerald-500"
            : upper === "PROCESSING"
            ? "bg-amber-500"
            : upper === "SCHEDULED"
            ? "bg-blue-500"
            : "bg-rose-500"
        }`}
      />
      {upper}
    </span>
  );
};
