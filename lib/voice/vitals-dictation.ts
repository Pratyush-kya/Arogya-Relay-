/**
 * Arogya Vaani — Frontline Field Voice Dictation Parser
 *
 * Designed for community health workers operating in gloved, rainy,
 * or fast-paced field screening environments. Uses on-device Web Speech API.
 * Never uploads raw audio. Deterministic regex parsing for vital signs.
 */

export interface ParsedVitals {
  age?: number;
  temperature?: number;
  spo2?: number;
  village?: string;
  patientRef?: string;
  symptoms: string[];
  rawTranscript: string;
  confidence: number;
}

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  cough: ["cough", "coughing", "khansi", "kaas"],
  fever: ["fever", "feverish", "bukhar", "high temp", "warm"],
  shortness_of_breath: ["breath", "breathing", "breathless", "saans", "dyspnea", "gasping"],
  chest_pain: ["chest pain", "chhati dard", "heart pain", "tightness"],
  fatigue: ["tired", "fatigue", "kamzori", "exhausted", "weakness"],
  chills: ["chills", "shivering", "thand", "shiver"],
  headache: ["headache", "head pain", "sir dard", "kapala"],
  sore_throat: ["throat", "sore throat", "gala kharab", "gala"],
  diarrhea: ["diarrhea", "loose motion", "dast", "pet kharab"],
  rash: ["rash", "skin", "itching", "khujli", "redness", "lesion"],
};

const COMMON_VILLAGES = [
  "Mawlynnong",
  "Pynursla",
  "Umroi",
  "Mawlong",
  "Cherrapunji",
  "Sonapur",
  "Nongpoh",
  "Shillong",
];

/** Parse natural spoken dictation into clinical screening fields */
export function parseSpokenVitals(transcript: string): ParsedVitals {
  const clean = transcript.toLowerCase();
  const result: ParsedVitals = {
    symptoms: [],
    rawTranscript: transcript,
    confidence: 0,
  };

  let points = 0;

  // 1. Parse Age (e.g. "age 34", "34 years", "34 year old", "age is 45")
  const ageMatch = clean.match(/(?:age|years? old|aged?|saal)\s*(?:is\s*)?(\d{1,3})/i) ||
                   clean.match(/(\d{1,3})\s*(?:years?|saal)/i);
  if (ageMatch && ageMatch[1]) {
    const parsedAge = parseInt(ageMatch[1], 10);
    if (parsedAge >= 0 && parsedAge <= 120) {
      result.age = parsedAge;
      points += 25;
    }
  }

  // 2. Parse Temperature (e.g. "temperature 38.5", "temp 39", "fever 101", "38.2 degrees")
  const tempMatch = clean.match(/(?:temp(?:erature)?|bukhar|fever)\s*(?:is\s*)?(\d{2,3}(?:\.\d)?)/i) ||
                    clean.match(/(\d{2}(?:\.\d)?)\s*(?:degrees?|deg|celsius|c\b)/i);
  if (tempMatch && tempMatch[1]) {
    let t = parseFloat(tempMatch[1]);
    // Convert Fahrenheit to Celsius if spoke in F (e.g. 100°F - 104°F)
    if (t > 50) {
      t = Math.round(((t - 32) * 5 / 9) * 10) / 10;
    }
    if (t >= 32 && t <= 44) {
      result.temperature = t;
      points += 25;
    }
  }

  // 3. Parse SpO2 / Oxygen (e.g. "oxygen 94", "spo2 96", "pulse ox 92 percent", "95 percent")
  const oxMatch = clean.match(/(?:oxygen|spo2|pulse\s*ox|o2)\s*(?:is\s*)?(\d{2,3})/i) ||
                  clean.match(/(\d{2})\s*(?:percent|%)/i);
  if (oxMatch && oxMatch[1]) {
    const ox = parseInt(oxMatch[1], 10);
    if (ox >= 60 && ox <= 100) {
      result.spo2 = ox;
      points += 25;
    }
  }

  // 4. Parse Village
  for (const v of COMMON_VILLAGES) {
    if (clean.includes(v.toLowerCase())) {
      result.village = v;
      points += 15;
      break;
    }
  }

  // 5. Parse Symptoms
  for (const [symKey, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    for (const kw of keywords) {
      if (clean.includes(kw)) {
        if (!result.symptoms.includes(symKey)) {
          result.symptoms.push(symKey);
          points += 10;
        }
        break;
      }
    }
  }

  result.confidence = Math.min(100, points);
  return result;
}

/** Check if Web Speech Recognition is available in current browser */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/**
 * Start listening for frontline vitals dictation.
 * Returns a stop listener function.
 */
export function startVitalsListening(
  onResult: (parsed: ParsedVitals) => void,
  onError?: (err: string) => void,
  lang = "en-IN"
): () => void {
  if (!isSpeechRecognitionSupported()) {
    onError?.("Speech recognition is not supported on this browser.");
    return () => {};
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        const parsed = parseSpokenVitals(transcript);
        onResult(parsed);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      onError?.(e.error || "Speech input failed");
    };

    recognition.start();
    return () => {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
  } catch (err) {
    onError?.(String(err));
    return () => {};
  }
}
