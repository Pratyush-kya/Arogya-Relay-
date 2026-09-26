/**
 * Arogya Relay read-aloud / voice utility (Problem Statement 3).
 *
 * Progressive enhancement only:
 *  - Tap-to-hear, replay, and speed control for any text.
 *  - Uses the on-device Web Speech API (speechSynthesis). Works offline; no
 *    audio or text is uploaded.
 *  - Detects capability and NEVER claims every device has accurate voice.
 *  - Recording (speech-to-text / voice input) is OUT OF SCOPE here and must
 *    default to off; this module only speaks, it never records.
 *  - Deleting raw audio after transcription is a recording concern and does not
 *    apply to read-aloud (which produces no recording).
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { LanguageCode } from "./types";

/** BCP-47 tag for a supported language (used by speechSynthesis). */
export function bcp47(lang: LanguageCode): string {
  const map: Record<LanguageCode, string> = {
    en: "en-IN",
    hi: "hi-IN",
    or: "or-IN",
    bn: "bn-IN",
    as: "as-IN",
    te: "te-IN",
    mr: "mr-IN",
    sat: "sat",
  };
  return map[lang];
}

export interface SpeakOptions {
  lang: LanguageCode;
  /** 0.5 (slow) – 2.0 (fast). Default 1.0. */
  rate?: number;
  /** Called when speaking ends (for UI state). */
  onEnd?: () => void;
}

/** True when the browser can speak at all. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speak text aloud. Returns a cancel function. If speech is unavailable, the
 * onEnd callback fires immediately so callers can degrade gracefully (e.g. show
 * the text louder / fall back to a recorded clip reference).
 */
export function speak(text: string, opts: SpeakOptions): () => void {
  if (!canSpeak()) {
    opts.onEnd?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // never overlap utterances
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = bcp47(opts.lang);
  utter.rate = opts.rate ?? 1.0;
  if (opts.onEnd) {
    utter.onend = () => opts.onEnd?.();
    utter.onerror = () => opts.onEnd?.();
  }
  synth.speak(utter);
  return () => {
    synth.cancel();
  };
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

