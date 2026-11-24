import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; message: string; tone: Tone; action?: { label: string; run: () => void } }
interface ToastApi { show: (message: string, opts?: { tone?: Tone; action?: ToastItem["action"]; duration?: number }) => void }

const Ctx = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi["show"]>((message, opts = {}) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, message, tone: opts.tone ?? "success", action: opts.action }]);
    window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 6000 : 3500));
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+12px)] lg:bottom-6" aria-live="polite" role="status">
        {items.map((t) => {
          const Icon = t.tone === "error" ? AlertTriangle : t.tone === "info" ? Info : CheckCircle2;
          return (
            <div key={t.id} className="pointer-events-auto flex items-center gap-3 w-full max-w-md rounded-md bg-navy text-white px-4 py-3 shadow-raised">
              <Icon className={t.tone === "error" ? "text-[#FCA5A5]" : "text-success"} size={20} aria-hidden />
              <p className="flex-1 text-sm">{t.message}</p>
              {t.action && (
                <button className="font-semibold text-sm underline underline-offset-2 min-h-[36px] px-2" onClick={() => { t.action!.run(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              )}
              <button className="icon-btn w-9 h-9 hover:bg-white/10" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                <X size={16} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
