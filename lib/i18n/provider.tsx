/**
 * Arogya Relay language provider + hooks (Problem Statement 3).
 *
 * Provides a device-level language preference (stored in localStorage, never as
 * a medical fact), a `t()` translator, and a `lang`/`dir` setter that updates
 * the document so screen readers and fonts switch correctly. Switching language
 * never loses an in-progress screening because the preference is global state,
 * not a per-form field.
 *
 * "Show original English" is supported per-render via `showOriginal` so clinical
 * Tier 1 instructions can always be shown verbatim.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_BY_CODE,
  LANGUAGE_STORAGE_KEY,
  resolveLanguage,
  t as translateKey,
  tf as formatTranslation,
  type LanguageCode,
} from "./index";

interface LanguageContextValue {
  lang: LanguageCode;
  dir: "ltr" | "rtl";
  /** Translate a catalog key for the active language. */
  t: (key: string) => string;
  /** Translate a complete message and replace named placeholders. */
  tf: (key: string, values: Record<string, string | number>) => string;
  /** Switch language (persisted as a device preference). */
  setLang: (lang: LanguageCode) => void;
  /** Per-view "show original English" toggle for clinical instructions. */
  showOriginal: boolean;
  setShowOriginal: (v: boolean) => void;
  /** Effective language for rendering (en when showOriginal is on). */
  effectiveLang: LanguageCode;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    return resolveLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server and first client render use the default language so the HTML matches
  // (no hydration mismatch). The persisted preference is applied AFTER mount in
  // the effect below — this is the correct pattern for a localStorage-backed
  // UI preference that legitimately differs from the server output.
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [showOriginal, setShowOriginal] = useState(false);

  // Apply the persisted language preference on the client, after hydration.
  useEffect(() => {
    const stored = readStoredLang();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount hydration from localStorage
    if (stored !== DEFAULT_LANGUAGE) setLangState(stored);
  }, []);

  // Keep <html lang/dir> in sync so assistive tech and fonts switch.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const meta = LANGUAGE_BY_CODE[lang];
    document.documentElement.lang = `${lang}-IN`;
    document.documentElement.dir = meta.dir;
  }, [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* storage may be unavailable (private mode); preference stays in-memory */
    }
  }, []);

  const effectiveLang = showOriginal ? DEFAULT_LANGUAGE : lang;

  const t = useCallback((key: string) => translateKey(key, effectiveLang), [effectiveLang]);
  const tf = useCallback(
    (key: string, values: Record<string, string | number>) => formatTranslation(key, effectiveLang, values),
    [effectiveLang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, dir: LANGUAGE_BY_CODE[lang].dir, t, tf, setLang, showOriginal, setShowOriginal, effectiveLang }),
    [lang, t, tf, setLang, showOriginal, effectiveLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

/** Translate a key without needing the hook (e.g. in static module scope). */
export function translateStatic(key: string, lang: LanguageCode): string {
  return translateKey(key, lang);
}

