import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** Last-resort error screen. Offers reload and a raw data export so nothing is lost. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  exportRaw = () => {
    const dump: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith("pain-tracker:")) dump[k] = localStorage.getItem(k); }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
    a.download = "Pain-Tracker-recovery.json";
    a.click();
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <div className="card card-pad max-w-md text-center" role="alert">
          <span className="icon-tile w-14 h-14 bg-danger-soft text-danger-ink mb-3"><AlertTriangle size={26} aria-hidden /></span>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-ink-muted mt-2">Pain Tracker hit an unexpected problem. Your saved entries are still on this device.</p>
          <div className="flex flex-col gap-2 mt-5">
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload Pain Tracker</button>
            <button className="btn-ghost" onClick={this.exportRaw}>Download a copy of my data</button>
          </div>
        </div>
      </main>
    );
  }
}
