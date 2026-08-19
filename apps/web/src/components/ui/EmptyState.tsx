import { Mail } from "lucide-react";
import { Button } from "./Button.js";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-gray-100 my-4">
      <div className="p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
        <Mail className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      <div className="h-12 bg-gray-50 border-b border-gray-100 px-6 flex items-center gap-4">
        <div className="w-1/4 h-4 bg-gray-200 rounded" />
        <div className="w-1/3 h-4 bg-gray-200 rounded" />
        <div className="w-1/4 h-4 bg-gray-200 rounded" />
        <div className="w-1/6 h-4 bg-gray-200 rounded" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 border-b border-gray-50 px-6 flex items-center gap-4"
        >
          <div className="w-1/4 h-3.5 bg-gray-100 rounded" />
          <div className="w-1/3 h-3.5 bg-gray-100 rounded" />
          <div className="w-1/4 h-3.5 bg-gray-100 rounded" />
          <div className="w-1/6 h-3.5 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
};
