import React, { useState } from "react";
import {
  useCurrentUser,
  useScheduledEmails,
  useSentEmails,
  useDashboardStats,
} from "../hooks/useEmailJobs.js";
import { authApi } from "../services/api.js";
import { ScheduledTable } from "../components/ScheduledTable.js";
import { SentTable } from "../components/SentTable.js";
import { ComposeModal } from "../components/ComposeModal.js";
import { StatCard } from "../components/ui/StatCard.js";
import { Button } from "../components/ui/Button.js";
import {
  Mail,
  Plus,
  LogOut,
  Clock,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { data: scheduledData, isLoading: isLoadingScheduled } = useScheduledEmails();
  const { data: sentData, isLoading: isLoadingSent } = useSentEmails();
  const { data: stats } = useDashboardStats();

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const handleComposeSuccess = (count: number) => {
    setToastMessage(`Successfully scheduled ${count} emails!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <span className="text-sm font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                ReachInbox
              </h1>
              <span className="text-[11px] text-gray-400 font-medium">
                Email Scheduler
              </span>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-9 h-9 rounded-full ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center">
                  {user?.name?.[0] || "U"}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-900 leading-tight">
                  {user?.name}
                </p>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header CTA Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Campaign Dashboard
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Manage scheduled email queues, rate limits, and delivery histories
            </p>
          </div>

          <Button
            onClick={() => setIsComposeOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-md hover:shadow-lg transition-all"
          >
            Compose New Email
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Scheduled"
            value={stats?.db?.scheduled ?? 0}
            icon={Clock}
            color="blue"
            subtitle="Pending BullMQ queue"
          />
          <StatCard
            title="Processing"
            value={stats?.db?.processing ?? 0}
            icon={Loader2}
            color="amber"
            subtitle="Active worker execution"
          />
          <StatCard
            title="Sent"
            value={stats?.db?.sent ?? 0}
            icon={Send}
            color="emerald"
            subtitle="Successfully delivered"
          />
          <StatCard
            title="Failed"
            value={stats?.db?.failed ?? 0}
            icon={AlertCircle}
            color="rose"
            subtitle="Retried / Error"
          />
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 flex items-center justify-between">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "scheduled"
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>Scheduled Emails</span>
              {scheduledData?.total !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === "scheduled"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {scheduledData.total}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("sent")}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "sent"
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>Sent Emails</span>
              {sentData?.total !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === "sent"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {sentData.total}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Panels */}
        <div>
          {activeTab === "scheduled" ? (
            <ScheduledTable
              jobs={scheduledData?.jobs}
              isLoading={isLoadingScheduled}
              onComposeClick={() => setIsComposeOpen(true)}
            />
          ) : (
            <SentTable
              jobs={sentData?.jobs}
              isLoading={isLoadingSent}
              onComposeClick={() => setIsComposeOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
};
