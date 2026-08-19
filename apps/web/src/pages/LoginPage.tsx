import React from "react";
import { Mail, ShieldCheck, Zap, Layers } from "lucide-react";
import { authApi } from "../services/api.js";

export const LoginPage: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center p-3.5 bg-brand-600/20 border border-brand-500/30 rounded-2xl mb-4 shadow-xl">
          <Mail className="w-9 h-9 text-brand-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          ReachInbox
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Smart email outreach, scheduled reliably.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-700/60 rounded-2xl sm:px-10">
          <div className="space-y-6">
            <div>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-600/80 rounded-xl shadow-md bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-slate-400 font-medium">
                  or for local development
                </span>
              </div>
            </div>

            <button
              onClick={() => { window.location.href = "/auth/dev-login"; }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-600/60 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <span className="text-emerald-400">⚡</span>
              Dev Login (No OAuth)
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-800 px-2 text-slate-400 font-medium">
                  Enterprise-Grade Features
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>BullMQ + Redis</strong> persistent delayed scheduling
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Distributed Rate Limiting</strong> & concurrency safe
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <Layers className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>PostgreSQL Persistence</strong> & idempotent processing
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Powered by ReachInbox Engine • Ethereal SMTP Ready
        </p>
      </div>
    </div>
  );
};
