/**
 * Arogya Relay read-aloud / voice utility (Problem Statement 3).
 *
 * Hardened High-Definition Speech Engine:
 *  - Quality-scored voice selection prioritizing Natural, Neural, and Google/Microsoft cloud voices.
 *  - Clinical text pronunciation normalization (expanding units, medical abbreviations, dosages).
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
  /** 0.5 (slow) – 2.0 (fast). Default 0.94 for natural clinical clarity. */
  rate?: number;
  /** Called when speaking ends (for UI state). */
  onEnd?: () => void;
}

// Keep active utterances in module scope to prevent V8/Chromium garbage collection mid-speech
const activeUtterances = new Set<SpeechSynthesisUtterance>();

/**
 * Score voice quality based on engine, vendor, and neural characteristics.
 * Returns a numerical score where higher is better quality.
 */
function scoreVoiceQuality(voice: SpeechSynthesisVoice, targetLang: string): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  // Exact language code match bonus
  if (lang === targetLang.toLowerCase()) {
    score += 40;
  } else if (lang.startsWith(targetLang.split("-")[0].toLowerCase())) {
    score += 20;
  }

  // Premium natural / neural voice keywords
  if (name.includes("natural") || name.includes("neural") || name.includes("online")) {
    score += 100;
  }
  if (name.includes("google")) {
    score += 80;
  }
  if (name.includes("apple") || name.includes("siri")) {
    score += 70;
  }
  if (name.includes("microsoft") || name.includes("cortana")) {
    score += 65;
  }
  if (name.includes("india") || name.includes("indian") || lang.includes("-in")) {
    score += 25;
  }

  // Heavily penalize robotic local synthetic engines
  if (name.includes("espeak") || name.includes("klatt") || name.includes("festival") || name.includes("mbrola")) {
    score -= 80;
  }

  return score;
}

/**
 * Finds the highest quality voice matching the target language.
 * Never falls back to English when speaking Indic scripts (Devanagari, Odia, Bengali).
 */
function hasMatchingVoice(synth: SpeechSynthesis, langCode: string): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const target = langCode.toLowerCase();
  const targetPrefix = target.split("-")[0];

  // Candidates matching exact lang or prefix
  const candidates = voices.filter((v) => {
    const vLang = v.lang.toLowerCase();
    return vLang === target || vLang.startsWith(targetPrefix);
  });

  if (candidates.length > 0) {
    // Sort descending by quality score
    candidates.sort((a, b) => scoreVoiceQuality(b, langCode) - scoreVoiceQuality(a, langCode));
    return candidates[0];
  }

  // If target language is English, fallback to best available English or system voice
  if (targetPrefix === "en") {
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    if (enVoices.length > 0) {
      enVoices.sort((a, b) => scoreVoiceQuality(b, "en-IN") - scoreVoiceQuality(a, "en-IN"));
      return enVoices[0];
    }
    return voices[0] ?? null;
  }

  // For non-English languages, if OS has no matching voice, return null to trigger server audio
  return null;
}

/**
 * Normalizes clinical and regional text into natural phonetics for text-to-speech.
 * Expands abbreviations, dosages, symbols, and Markdown.
 */
export function normalizeClinicalSpeechText(text: string, lang: LanguageCode): string {
  if (!text) return "";

  let cleaned = text
    // Strip markdown formatting symbols
    .replace(/[#*_~`]/g, "")
    // Strip HTML tags
    .replace(/<[^>]*>/g, "")
    // Clean bullet symbols and arrows
    .replace(/^[•\-\*]\s+/gm, "")
    .replace(/→|←|⇒/g, "")
    // Normalize dashes and slashes
    .replace(/\s*[\/|\\]\s*/g, " ")
    .replace(/\s*–\s*/g, " ");

  // Normalizations for English speech
  if (lang === "en") {
    cleaned = cleaned
      .replace(/(\d+)\s*mg\b/gi, "$1 milligrams")
      .replace(/(\d+)\s*ml\b/gi, "$1 milliliters")
      .replace(/(\d+)\s*g\b/gi, "$1 grams")
      .replace(/(\d+(?:\.\d+)?)\s*°C\b/gi, "$1 degrees Celsius")
      .replace(/\bSpO2\b/gi, "blood oxygen level")
      .replace(/\bBP\b/g, "blood pressure")
      .replace(/\bPHC\b/g, "Primary Health Centre")
      .replace(/\bCHC\b/g, "Community Health Centre")
      .replace(/\bASHA\b/g, "Asha worker")
      .replace(/\bMMU\b/g, "Mobile Medical Unit")
      .replace(/\bOPD\b/g, "outpatient clinic")
      .replace(/\bORS\b/g, "oral rehydration solution")
      .replace(/\bRDT\b/g, "rapid diagnostic test")
      .replace(/\btab\b/gi, "tablet")
      .replace(/\bOD\b/g, "once daily")
      .replace(/\bBD\b/g, "twice daily")
      .replace(/\bTDS\b/g, "three times daily");
  }

  // Normalizations for Hindi speech
  if (lang === "hi") {
    cleaned = cleaned
      .replace(/(\d+)\s*mg\b/gi, "$1 मिलीग्राम")
      .replace(/(\d+)\s*ml\b/gi, "$1 मिलीलीटर")
      .replace(/(\d+(?:\.\d+)?)\s*°C\b/gi, "$1 डिग्री सेल्सियस")
      .replace(/\bSpO2\b/gi, "ऑक्सीजन स्तर")
      .replace(/\bBP\b/g, "रक्तचाप")
      .replace(/\bPHC\b/g, "प्राथमिक स्वास्थ्य केंद्र")
      .replace(/\bORS\b/g, "ओआरएस घोल")
      .replace(/\bASHA\b/g, "आशा कार्यकर्ता");
  }

  // Normalizations for Odia speech
  if (lang === "or") {
    cleaned = cleaned
      .replace(/(\d+)\s*mg\b/gi, "$1 ମିଲିଗ୍ରାମ")
      .replace(/(\d+)\s*ml\b/gi, "$1 ମିଲିଲିଟର")
      .replace(/(\d+(?:\.\d+)?)\s*°C\b/gi, "$1 ଡିଗ୍ରୀ ସେଲସିୟସ")
      .replace(/\bSpO2\b/gi, "ଅକ୍ସିଜେନ ସ୍ତର")
      .replace(/\bBP\b/g, "ରକ୍ତଚାପ")
      .replace(/\bORS\b/g, "ଓଆରଏସ ଘୋଳ");
  }

  return cleaned.replace(/\s+/g, " ").trim();
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
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {}
}

let currentAudio: HTMLAudioElement | null = null;

export function playServerAudio(text: string, opts: SpeakOptions): () => void {
  stopSpeaking();
  playAuditoryChime();

  try {
    const clean = normalizeClinicalSpeechText(text, opts.lang);
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(clean.slice(0, 2000))}&lang=${opts.lang}`);
    audio.playbackRate = opts.rate ?? 0.94;
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
 * Speak text aloud with sequential sentence chunking, quality voice ranking,
 * and automatic server audio fallback.
 */
export function speak(text: string, opts: SpeakOptions): () => void {
  const normalizedText = normalizeClinicalSpeechText(text, opts.lang);

  // If browser lacks Web Speech API, use server audio
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return playServerAudio(normalizedText, opts);
  }

  const synth = window.speechSynthesis;
  const langTag = bcp47(opts.lang);
  const matchedVoice = hasMatchingVoice(synth, langTag);

  // If host OS has NO voice for non-English language (e.g. Hindi/Odia on Linux/Windows), use server audio
  if (!matchedVoice && opts.lang !== "en") {
    return playServerAudio(normalizedText, opts);
  }

  // Cancel prior utterances
  stopSpeaking();
  playAuditoryChime();

  if (synth.paused) {
    try {
      synth.resume();
    } catch {}
  }

  const chunks = splitTextIntoSentences(normalizedText, 140);
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
    // High-definition clarity tempo: 0.94x rate is optimal for rural patient comprehension
    utter.rate = opts.rate ?? 0.94;
    utter.pitch = 1.0;

    utter.onend = () => {
      activeUtterances.delete(utter);
      if (!isCancelled) {
        // Micro-pause between sentence boundaries for natural cadence
        setTimeout(() => {
          if (!isCancelled) speakNextChunk();
        }, 60);
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
