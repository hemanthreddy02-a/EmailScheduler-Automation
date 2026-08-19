import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCurrentUser } from "./hooks/useEmailJobs.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { data: user, isLoading, isError } = useCurrentUser();

  // Handle path routing for /login or /dashboard
  const currentPath = window.location.pathname;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm font-medium text-slate-300">Checking authentication...</p>
      </div>
    );
  }

  // If unauthenticated or error checking user, show login page
  if (isError || !user) {
    if (currentPath === "/dashboard") {
      window.history.replaceState(null, "", "/login");
    }
    return <LoginPage />;
  }

  // If authenticated and on login page, redirect to dashboard
  if (currentPath === "/login") {
    window.history.replaceState(null, "", "/dashboard");
  }

  return <DashboardPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
