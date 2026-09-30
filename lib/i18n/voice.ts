/**
 * Arogya Relay read-aloud / voice utility (Problem Statement 3).
 *
 * Hardened Speech Engine:
 *  - Tap-to-hear, replay, and speed control for any text.
 *  - Sequential sentence chunking to eliminate Chromium/WebKit 15-second speech stall.
 *  - Automatic fallback to high-fidelity /api/tts server audio when host OS
 *    lacks native voices for regional Indian languages (Hindi, Odia, Bengali, Telugu, etc.).
 *  - Clean cancel and stop hooks.
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
  return map[lang] || "en-IN";
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

/**
 * Checks whether the host OS has an installed voice genuinely matching the requested language.
 * Crucial fix: never fallback to English voice when speaking Indic scripts (Devanagari, Odia, Bengali),
 * as that causes instant silence, synthesis error, or severe speech stutter.
 */
function hasMatchingVoice(synth: SpeechSynthesis, langCode: string): SpeechSynthesisVoice | null {
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

  // If target language is English, fallback to any English or system voice
  if (prefix === "en") {
    const enIn = voices.find((v) => v.lang.toLowerCase().includes("en-in"));
    if (enIn) return enIn;
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (anyEn) return anyEn;
    return voices[0] ?? null;
  }

  // If target language is non-English and OS lacks this voice, return null to trigger server audio!
  return null;
}

/** True when the browser can speak (either via Web Speech API or HTML5 Audio). */
export function canSpeak(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window || typeof Audio !== "undefined";
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
    // Clean text of mixed Hindi/English markers if any
    const clean = text.replace(/[\n\r]+/g, " ").trim();
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(clean.slice(0, 2000))}&lang=${opts.lang}`);
    audio.playbackRate = opts.rate ?? 1.0;
    currentAudio = audio;

    let finished = false;
    const cleanup = () => {
      if (!finished) {
        finished = true;
        if (currentAudio === audio) currentAudio = null;
        opts.onEnd?.();
      }
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
 * Split text into natural sentence boundaries (max 140 chars)
 * to completely eliminate the browser 15-second speech synthesis cutoff bug.
 */
export function splitTextIntoSentences(text: string, maxLen = 140): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxLen) return [text.trim()];

  const rawSentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks: string[] = [];

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split sentence by comma, semicolon, or whitespace
      const words = trimmed.split(/\s+/);
      let current = "";
      for (const word of words) {
        if ((current + " " + word).trim().length > maxLen) {
          if (current.trim()) chunks.push(current.trim());
          current = word;
        } else {
          current = current ? current + " " + word : word;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

/**
 * Speak text aloud with sequential sentence chunking and automatic server audio fallback.
 * Guarantees speech plays to 100% completion without premature halting.
 */
export function speak(text: string, opts: SpeakOptions): () => void {
  // If browser lacks Web Speech API, use server audio
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return playServerAudio(text, opts);
  }

  const synth = window.speechSynthesis;
  const langTag = bcp47(opts.lang);
  const matchedVoice = hasMatchingVoice(synth, langTag);

  // If host OS has NO voice for non-English language (e.g. Hindi/Odia on Linux/Windows), use server audio
  if (!matchedVoice && opts.lang !== "en") {
    return playServerAudio(text, opts);
  }

  // Cancel prior utterances
  stopSpeaking();
  playAuditoryChime();

  if (synth.paused) {
    try {
      synth.resume();
    } catch {}
  }

  const chunks = splitTextIntoSentences(text, 140);
  if (chunks.length === 0) {
    opts.onEnd?.();
    return () => {};
  }

  let currentIndex = 0;
  let isCancelled = false;

  function speakNextChunk() {
    if (isCancelled || currentIndex >= chunks.length) {
      activeUtterances.clear();
      opts.onEnd?.();
      return;
    }

    const chunk = chunks[currentIndex++];
    const utter = new SpeechSynthesisUtterance(chunk);
    if (matchedVoice) {
      utter.voice = matchedVoice;
      utter.lang = matchedVoice.lang;
    } else {
      utter.lang = langTag;
    }
    utter.rate = opts.rate ?? 1.0;
    utter.pitch = 1.0;

    utter.onend = () => {
      activeUtterances.delete(utter);
      if (!isCancelled) {
        speakNextChunk();
      }
    };

    utter.onerror = () => {
      activeUtterances.delete(utter);
      if (!isCancelled) {
        // Fall back remaining text to server audio
        const remaining = chunks.slice(currentIndex - 1).join(" ");
        if (remaining.trim()) {
          playServerAudio(remaining, opts);
        } else {
          opts.onEnd?.();
        }
      }
    };

    activeUtterances.add(utter);

    try {
      if (synth.paused) synth.resume();
      synth.speak(utter);
    } catch {
      activeUtterances.delete(utter);
      playServerAudio(chunks.slice(currentIndex - 1).join(" "), opts);
    }
  }

  // Start sequential speaking
  speakNextChunk();

  return () => {
    isCancelled = true;
    activeUtterances.clear();
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
