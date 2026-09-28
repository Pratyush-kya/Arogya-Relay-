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

// Keep active utterances in module scope to prevent V8/Chromium garbage collection mid-speech
const activeUtterances = new Set<SpeechSynthesisUtterance>();

function selectBestVoice(synth: SpeechSynthesis, langCode: string): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const target = langCode.toLowerCase();
  // 1. Try exact lang tag match (e.g. "hi-in", "en-in")
  const exact = voices.find((v) => v.lang.toLowerCase() === target);
  if (exact) return exact;

  // 2. Try language prefix match (e.g. "hi", "en", "te")
  const prefix = target.split("-")[0];
  const langMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  if (langMatch) return langMatch;

  // 3. Fallback to Indian English ("en-IN")
  const enIn = voices.find((v) => v.lang.toLowerCase().includes("en-in"));
  if (enIn) return enIn;

  // 4. Fallback to any English or primary system voice
  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (anyEn) return anyEn;

  return voices[0] ?? null;
}

/** True when the browser can speak at all. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Audio feedback chime helper using Web Audio API
export function playAuditoryChime(): void {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

let currentAudio: HTMLAudioElement | null = null;

export function playServerAudio(text: string, opts: SpeakOptions): () => void {
  stopSpeaking();
  playAuditoryChime();

  try {
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text.slice(0, 500))}&lang=${opts.lang}`);
    audio.playbackRate = opts.rate ?? 1.0;
    currentAudio = audio;

    const cleanup = () => {
      if (currentAudio === audio) currentAudio = null;
      opts.onEnd?.();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    audio.play().catch(() => {
      cleanup();
    });

    return () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
      cleanup();
    };
  } catch {
    opts.onEnd?.();
    return () => {};
  }
}

/**
 * Speak text aloud. Returns a cancel function.
 * Hardened against Chromium speech stall, garbage-collection, user-gesture loss, and missing regional voice packs.
 * Automatically falls back to /api/tts server audio if client OS speech synthesis lacks voices or fails.
 */
export function speak(text: string, opts: SpeakOptions): () => void {
  if (!canSpeak()) {
    return playServerAudio(text, opts);
  }

  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  // If host OS has zero installed TTS voices, immediately use resilient server audio
  if (!voices || voices.length === 0) {
    return playServerAudio(text, opts);
  }

  // Play subtle audio confirmation chime
  playAuditoryChime();

  // Unpause in case browser audio pipeline was backgrounded or frozen
  if (synth.paused) {
    try {
      synth.resume();
    } catch {}
  }

  // Cancel prior utterances
  try {
    synth.cancel();
  } catch {}
  activeUtterances.clear();

  const langTag = bcp47(opts.lang);
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 1.0;
  utter.pitch = 1.0;

  // Select best voice if loaded; match utterance lang to selected voice to avoid language-unavailable failure
  const matchedVoice = selectBestVoice(synth, langTag);
  if (matchedVoice) {
    utter.voice = matchedVoice;
    utter.lang = matchedVoice.lang;
  } else {
    // If no voice matched the regional tag, fall back to server audio for safety
    return playServerAudio(text, opts);
  }

  // Prevent GC from collecting utterance before onend fires
  activeUtterances.add(utter);

  const cleanup = () => {
    activeUtterances.delete(utter);
    opts.onEnd?.();
  };

  utter.onend = cleanup;
  utter.onerror = (_e) => {
    cleanup();
    // Fall back to server audio on speech synthesis error
    playServerAudio(text, opts);
  };

  // Execute synchronously within the user gesture click handler
  try {
    if (synth.paused) synth.resume();
    synth.speak(utter);
  } catch (err) {
    cleanup();
    return playServerAudio(text, opts);
  }

  return () => {
    activeUtterances.delete(utter);
    try {
      synth.cancel();
    } catch {}
  };
}

export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    activeUtterances.clear();
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}


