import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONSENT_VERSION, type CollectionName, type Consent, type PatientData, type Profile, type Settings } from "@/data/models";
import { buildDemoData, DEMO_PROFILE } from "@/data/demoData";
import { createAdapter, EMPTY_DATA, prefs, StorageError, type DataAdapter } from "@/storage";
import { auth } from "@/auth/auth";
import { newId } from "@/lib/id";
import { useToast } from "@/components/Toast";

type Status = "loading" | "ready" | "error";
type Rec<C extends CollectionName> = PatientData[C][number];
type Draft<C extends CollectionName> = Omit<Rec<C>, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string };

export const DEFAULT_SETTINGS: Settings = { notificationsEnabled: false, voiceInputEnabled: false, reduceCharts: false };

interface Store {
  status: Status;
  error: string | null;
  data: PatientData;
  profile: Profile | null;
  consent: Consent | null;
  settings: Settings;
  adapterKind: DataAdapter["kind"];
  save<C extends CollectionName>(collection: C, record: Draft<C>): Promise<Rec<C>>;
  remove(collection: CollectionName, id: string, opts?: { undoLabel?: string }): Promise<void>;
  completeOnboarding(input: { name: string; goals: string[]; consent: Omit<Consent, "version" | "acceptedAt">; withDemo: boolean }): Promise<void>;
  updateProfile(p: Partial<Profile>): void;
  updateSettings(s: Partial<Settings>): void;
  updateConsent(c: Partial<Consent>): void;
  resetDemo(): Promise<void>;
  deleteAll(): Promise<void>;
  exportJSON(): string;
  retry(): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <AppStoreProvider>");
  return s;
}

export function AppStoreProvider({ children, adapter: injected }: { children: ReactNode; adapter?: DataAdapter }) {
  const toast = useToast();
  const adapter = useMemo(() => injected ?? createAdapter(), [injected]);
  const session = auth.getSession()!;
  const pid = session.patientId;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PatientData>(EMPTY_DATA);
  const [profile, setProfile] = useState<Profile | null>(() => prefs.get<Profile | null>("profile", null));
  const [consent, setConsent] = useState<Consent | null>(() => {
    const c = prefs.get<Consent | null>("consent", null);
    return c && c.version === CONSENT_VERSION ? c : null;
  });
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...prefs.get<Partial<Settings>>("settings", {}) }));
  const dataRef = useRef(data);
  dataRef.current = data;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    adapter
      .load(pid)
      .then((loaded) => {
        if (!alive) return;
        setData(loaded ?? EMPTY_DATA);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Your records could not be loaded.");
        setStatus("error");
      });
    return () => { alive = false; };
  }, [adapter, pid, attempt]);

  const fail = useCallback((e: unknown) => {
    toast.show(e instanceof StorageError ? e.message : "That change could not be saved. Please try again.", { tone: "error" });
  }, [toast]);

  const save = useCallback<Store["save"]>(async (collection, record) => {
    const now = new Date().toISOString();
    const full = { ...record, id: record.id ?? newId(), createdAt: record.createdAt ?? now, updatedAt: now } as unknown as Rec<typeof collection>;
    const prev = dataRef.current;
    const list = prev[collection] as Array<{ id: string }>;
    const exists = list.some((r) => r.id === (full as { id: string }).id);
    const next = { ...prev, [collection]: exists ? list.map((r) => (r.id === (full as { id: string }).id ? full : r)) : [...list, full] };
    setData(next as PatientData);
    try {
      await adapter.upsert(pid, collection, full);
    } catch (e) {
      setData(prev);
      fail(e);
      throw e;
    }
    return full;
  }, [adapter, pid, fail]);

  const remove = useCallback<Store["remove"]>(async (collection, id, opts) => {
    const prev = dataRef.current;
    const removed = (prev[collection] as Array<{ id: string }>).find((r) => r.id === id);
    setData({ ...prev, [collection]: (prev[collection] as Array<{ id: string }>).filter((r) => r.id !== id) } as PatientData);
    try {
      await adapter.remove(pid, collection, id);
      if (removed) {
        toast.show(opts?.undoLabel ?? "Deleted", {
          tone: "info",
          action: {
            label: "Undo",
            run: () => {
              setData((d) => ({ ...d, [collection]: [...(d[collection] as Array<{ id: string }>), removed] }) as PatientData);
              adapter.upsert(pid, collection, removed as never).catch(fail);
            },
          },
        });
      }
    } catch (e) {
      setData(prev);
      fail(e);
    }
  }, [adapter, pid, toast, fail]);

  const completeOnboarding = useCallback<Store["completeOnboarding"]>(async ({ name, goals, consent: c, withDemo }) => {
    const now = new Date();
    const p: Profile = withDemo ? { ...DEMO_PROFILE(now), displayName: name || "Sarah", goals } : { id: pid, displayName: name || "there", role: session.role, goals, createdAt: now.toISOString() };
    const cs: Consent = { ...c, version: CONSENT_VERSION, acceptedAt: now.toISOString() };
    const d = withDemo ? buildDemoData(now) : structuredClone(EMPTY_DATA);
    await adapter.replaceAll(pid, d);
    prefs.set("profile", p);
    prefs.set("consent", cs);
    const s = { ...settings, voiceInputEnabled: c.voiceDictation };
    prefs.set("settings", s);
    setSettings(s);
    setProfile(p);
    setConsent(cs);
    setData(d);
  }, [adapter, pid, session.role, settings]);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((cur) => {
      const next = { ...(cur as Profile), ...p };
      prefs.set("profile", next);
      return next;
    });
  }, []);
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...s };
      prefs.set("settings", next);
      return next;
    });
  }, []);
  const updateConsent = useCallback((c: Partial<Consent>) => {
    setConsent((cur) => {
      const next = { ...(cur as Consent), ...c };
      prefs.set("consent", next);
      return next;
    });
  }, []);

  const resetDemo = useCallback(async () => {
    const d = buildDemoData(new Date());
    await adapter.replaceAll(pid, d);
    prefs.remove("pain-draft");
    setData(d);
  }, [adapter, pid]);

  const deleteAll = useCallback(async () => {
    await adapter.clear(pid);
    for (const k of ["profile", "consent", "settings", "pain-draft", "install-dismissed"]) prefs.remove(k);
    setData(structuredClone(EMPTY_DATA));
    setProfile(null);
    setConsent(null);
    setSettings(DEFAULT_SETTINGS);
  }, [adapter, pid]);

  const exportJSON = useCallback(() => JSON.stringify({ exportedAt: new Date().toISOString(), app: "Pain Tracker", profile, consent, settings, data: dataRef.current }, null, 2), [profile, consent, settings]);

  const value: Store = {
    status, error, data, profile, consent, settings, adapterKind: adapter.kind,
    save, remove, completeOnboarding, updateProfile, updateSettings, updateConsent, resetDemo, deleteAll, exportJSON,
    retry: () => setAttempt((a) => a + 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
