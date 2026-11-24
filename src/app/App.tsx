import type React from "react";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AlertTriangle, Compass } from "lucide-react";
import { AppStoreProvider, useStore } from "./AppStore";
import { AppShell, Page } from "./AppShell";
import { ErrorBoundary } from "./ErrorBoundary";
import { ToastProvider, useToast } from "@/components/Toast";
import { EmptyState, Skeleton } from "@/components/ui";
import { useReminderRunner } from "@/hooks/useReminderRunner";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";

const LogPain = lazy(() => import("@/pages/LogPain"));
const History = lazy(() => import("@/pages/History"));
const Insights = lazy(() => import("@/pages/Insights"));
const Reminders = lazy(() => import("@/pages/Reminders"));
const Settings = lazy(() => import("@/pages/Settings"));
const Medications = lazy(() => import("@/pages/Medications"));
const Treatments = lazy(() => import("@/pages/Treatments"));
const Exercise = lazy(() => import("@/pages/Exercise"));
const Meals = lazy(() => import("@/pages/Meals"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Report = lazy(() => import("@/pages/Report"));

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
      <Skeleton className="h-28" />
    </div>
  );
}

function NotFound() {
  return <Page title="Page not found" back="/"><div className="card"><EmptyState icon={Compass} title="We couldn't find that page" action={<Link to="/" className="btn-primary">Go to Home</Link>} /></div></Page>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function UpdatePrompt() {
  const toast = useToast();
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    import("virtual:pwa-register").then(({ registerSW }) => {
      const update = registerSW({
        onNeedRefresh: () => toast.show("A new version of Pain Tracker is ready.", { tone: "info", duration: 15000, action: { label: "Update", run: () => update(true) } }),
        onOfflineReady: () => toast.show("Pain Tracker is ready to work offline.", { tone: "info" }),
      });
    }).catch(() => {});
  }, [toast]);
  return null;
}

function Gate() {
  const { status, error, consent, profile, retry } = useStore();
  useReminderRunner();
  if (status === "loading") return <div className="min-h-screen"><PageSkeleton /></div>;
  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card card-pad max-w-md text-center" role="alert">
          <span className="icon-tile w-14 h-14 bg-danger-soft text-danger-ink mb-3"><AlertTriangle size={26} aria-hidden /></span>
          <h1 className="text-xl font-bold">Your records couldn't be loaded</h1>
          <p className="text-ink-muted mt-2">{error}</p>
          <button className="btn-primary mt-5" onClick={retry}>Try again</button>
        </div>
      </main>
    );
  }
  if (!consent || !profile) return <Routes><Route path="*" element={<Onboarding />} /></Routes>;
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/log" element={<LogPain />} />
          <Route path="/log/:id" element={<LogPain />} />
          <Route path="/history" element={<History />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/treatments" element={<Treatments />} />
          <Route path="/exercise" element={<Exercise />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/report" element={<Report />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

/** Hash routing when hosted as static files without an SPA fallback (VITE_ROUTER=hash). */
function Router({ children }: { children: React.ReactNode }) {
  if (import.meta.env.VITE_ROUTER === "hash") return <HashRouter>{children}</HashRouter>;
  return <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>{children}</BrowserRouter>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppStoreProvider>
          <Router>
            <ScrollTop />
            <UpdatePrompt />
            <Gate />
          </Router>
        </AppStoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
