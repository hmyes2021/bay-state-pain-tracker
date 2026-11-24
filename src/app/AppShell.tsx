import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bell, CalendarDays, ChevronLeft, Dumbbell, FileText, House, LineChart, Pill, Plus, Settings, Syringe, Utensils, WifiOff, X } from "lucide-react";
import { BrandMark } from "@/components/Brand";
import { useOnline } from "@/hooks/useOnline";
import { cx } from "@/lib/cx";
import type { Icon } from "@/components/ui";

/* Mobile order is fixed by the Pain Tracker brief: Home, Insights, Add Log (centre), Settings, Reminders. */
const MOBILE_NAV: Array<{ to: string; label: string; icon: Icon }> = [
  { to: "/", label: "Home", icon: House },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/reminders", label: "Reminders", icon: Bell },
];

const DESKTOP_NAV: Array<{ group: string; items: Array<{ to: string; label: string; icon: Icon }> }> = [
  { group: "Daily", items: [{ to: "/", label: "Home", icon: House }, { to: "/history", label: "Pain history", icon: Activity }, { to: "/insights", label: "Insights", icon: LineChart }, { to: "/reminders", label: "Reminders", icon: Bell }] },
  { group: "Care", items: [{ to: "/medications", label: "Medications", icon: Pill }, { to: "/treatments", label: "Injections", icon: Syringe }, { to: "/exercise", label: "Exercise", icon: Dumbbell }, { to: "/meals", label: "Meals", icon: Utensils }, { to: "/appointments", label: "Appointments", icon: CalendarDays }] },
  { group: "Share", items: [{ to: "/report", label: "Patient report", icon: FileText }, { to: "/settings", label: "Settings", icon: Settings }] },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-navy text-white z-30" aria-label="Main">
      <Link to="/" className="flex items-center gap-3 px-5 h-[72px] border-b border-white/10">
        <BrandMark />
        <span>
          <span className="block font-extrabold text-lg leading-tight">Pain Tracker</span>
          <span className="block text-xs text-white/75">Bay State Pain Associates</span>
        </span>
      </Link>
      <div className="px-4 pt-5">
        <Link to="/log" className="btn btn-lg w-full bg-white text-navy hover:bg-accent-soft shadow-fab"><Plus size={20} aria-hidden /> Log pain</Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sections">
        {DESKTOP_NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <p className="px-3 mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white/65">{g.group}</p>
            <ul>
              {g.items.map(({ to, label, icon: I }) => (
                <li key={to}>
                  <NavLink to={to} end={to === "/"} className={({ isActive }) => cx("flex items-center gap-3 rounded-sm px-3 min-h-[44px] text-[0.95rem] transition-colors", isActive ? "bg-white/15 font-semibold text-white" : "text-white/85 hover:bg-white/10 hover:text-white")}>
                    <I size={19} aria-hidden /> {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="px-5 py-4 text-xs text-white/70 border-t border-white/10">Demo · fictional data stored on this device only.</p>
    </aside>
  );
}

function BottomNav() {
  const item = ({ to, label, icon: I }: (typeof MOBILE_NAV)[number]) => (
    <li key={to} className="flex-1">
      <NavLink to={to} end={to === "/"} className={({ isActive }) => cx("flex flex-col items-center justify-center gap-0.5 h-[var(--nav-h)] text-[0.72rem] font-medium", isActive ? "text-primary" : "text-ink-muted")}>
        {({ isActive }) => (<>
          <span className={cx("flex items-center justify-center w-12 h-7 rounded-full transition-colors", isActive && "bg-primary-soft")}><I size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden /></span>
          {label}
        </>)}
      </NavLink>
    </li>
  );
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-raised border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <ul className="flex items-stretch max-w-2xl mx-auto">
        {MOBILE_NAV.slice(0, 2).map(item)}
        <li className="flex-1 flex justify-center">
          <NavLink to="/log" aria-label="Add pain log" className={({ isActive }) => cx("flex flex-col items-center justify-center -mt-5 gap-0.5 text-[0.72rem] font-semibold", isActive ? "text-navy" : "text-primary")}>
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white shadow-fab ring-4 ring-surface-raised"><Plus size={30} strokeWidth={2.6} aria-hidden /></span>
            Add Log
          </NavLink>
        </li>
        {MOBILE_NAV.slice(2).map(item)}
      </ul>
    </nav>
  );
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-warning-soft text-warning-ink text-sm font-medium px-4 py-2">
      <WifiOff size={16} aria-hidden /> You're offline. Entries are saved on this device and stay available.
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar />
      <div className="lg:pl-64">
        <OfflineBanner />
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

/**
 * Page frame. Mobile: navy title bar from the prototype (✕ / back, title, action).
 * Desktop: title in the content column. Focuses the heading on navigation for screen readers.
 */
export function Page({ title, children, back, close, action, wide = false, hideTitleOnMobile = false, mobileTitle }: { title: string; children: ReactNode; back?: string | true; close?: () => void; action?: ReactNode; wide?: boolean; hideTitleOnMobile?: boolean; mobileTitle?: string }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    document.title = `${title} · Bay State Pain Tracker`;
    if (loc.key !== "default") h1.current?.focus({ preventScroll: true });
  }, [title, loc.key]);
  const goBack = () => (typeof back === "string" ? nav(back) : nav(-1));
  return (
    <>
      <header className={cx("lg:hidden sticky top-0 z-20 bg-navy text-white pt-[env(safe-area-inset-top)]", hideTitleOnMobile && "sr-only")}>
        <div className="flex items-center h-[var(--header-h)] px-2 gap-1">
          <div className="w-14 flex">
            {close ? (
              <button type="button" className="icon-btn hover:bg-white/10" onClick={close} aria-label="Close"><span className="w-7 h-7 rounded-full bg-white text-navy flex items-center justify-center"><X size={18} strokeWidth={3} aria-hidden /></span></button>
            ) : back ? (
              <button type="button" className="icon-btn hover:bg-white/10" onClick={goBack} aria-label="Back"><ChevronLeft size={26} aria-hidden /></button>
            ) : null}
          </div>
          <p className="flex-1 text-center text-lg font-bold truncate" aria-hidden>{mobileTitle ?? title}</p>
          <div className="min-w-14 flex justify-end">{action}</div>
        </div>
      </header>
      <main id="main" className={cx("mx-auto px-4 md:px-6 lg:px-10 pt-4 lg:pt-8 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+32px)] lg:pb-12", wide ? "max-w-6xl" : "max-w-3xl")}>
        <div className={cx("flex items-center gap-3 mb-4 lg:mb-6", !hideTitleOnMobile && "sr-only lg:not-sr-only lg:flex")}>
          {(back || close) && <button type="button" className="hidden lg:inline-flex icon-btn text-primary" onClick={close ?? goBack} aria-label={close ? "Close" : "Back"}>{close ? <X size={22} aria-hidden /> : <ChevronLeft size={24} aria-hidden />}</button>}
          <h1 ref={h1} tabIndex={-1} className="text-2xl lg:text-3xl font-bold flex-1 outline-none">{title}</h1>
          <div className="hidden lg:flex">{action}</div>
        </div>
        {children}
      </main>
    </>
  );
}

/** Save button styled like the prototype title-bar "Save" (on navy) and as primary on desktop. */
export function HeaderSave({ onClick, label = "Save", form }: { onClick?: () => void; label?: string; form?: string }) {
  return (
    <button type={form ? "submit" : "button"} form={form} onClick={onClick} className="btn min-h-[40px] px-3 bg-white/15 text-white hover:bg-white/25 lg:bg-primary lg:hover:bg-primary-hover lg:min-h-[44px] lg:px-5">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z" /></svg>
      {label}
    </button>
  );
}
