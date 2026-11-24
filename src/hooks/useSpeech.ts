import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in lib.dom for all browsers). */
interface SR extends EventTarget {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SR;

export function speechSupported(): boolean {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Voice-to-text via the browser's speech recognition. Some browsers (e.g. Chrome) send
 * audio to the browser vendor's speech service, so dictation is opt-in and disclosed in
 * consent and Settings. Nothing is sent by Pain Tracker itself.
 */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SR | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setError("Voice input isn't supported in this browser. You can use your keyboard's dictation instead."); return; }
    setError(null);
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) cb.current(text.trim());
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone permission was denied. Allow it in your browser settings to dictate." : e.error === "network" ? "Voice input needs an internet connection in this browser." : "Voice input stopped. Please try again.");
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => { rec.current?.stop(); setListening(false); }, []);
  return { listening, error, start, stop, supported: typeof window !== "undefined" && speechSupported() };
}
