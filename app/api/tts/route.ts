import { NextRequest, NextResponse } from "next/server";
import { API_RESPONSE_HEADERS, cleanText } from "@/lib/http-security";

const LANG_MAP: Record<string, string> = {
  en: "en",
  hi: "hi",
  bn: "bn",
  te: "te",
  mr: "mr",
  or: "hi", // Odia phonetic fallback
  as: "bn", // Assamese phonetic fallback
  sat: "hi", // Santali phonetic fallback
};

/**
 * Split long text into natural chunks (<= maxLen characters)
 * to respect upstream TTS character limits while preserving sentences and words.
 */
function splitTextIntoChunks(text: string, maxLen = 170): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  // Split on sentence boundaries (., !, ?, ।, or newlines)
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];

  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLen) {
      // Sentence itself exceeds limit: split by words
      const words = trimmed.split(/\s+/);
      for (const word of words) {
        if ((current + " " + word).trim().length > maxLen) {
          if (current.trim()) chunks.push(current.trim());
          current = word;
        } else {
          current = current ? current + " " + word : word;
        }
      }
    } else if ((current + " " + trimmed).trim().length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get("text") ?? "";
  const rawLang = searchParams.get("lang") ?? "en";

  // Allow up to 2000 characters for long disease descriptions, prescriptions, and guidelines
  const text = cleanText(rawText, 2000);
  if (!text) {
    return NextResponse.json(
      { error: "Text parameter is required." },
      { status: 400, headers: API_RESPONSE_HEADERS }
    );
  }

  const langCode = LANG_MAP[rawLang] ?? "en";
  const chunks = splitTextIntoChunks(text, 170);

  try {
    const audioBuffers: ArrayBuffer[] = [];

    // Synthesize each chunk and collect audio buffers
    for (const chunk of chunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(ttsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (res.ok) {
        audioBuffers.push(await res.arrayBuffer());
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json(
        { error: "Upstream TTS synthesis failed." },
        { status: 502, headers: API_RESPONSE_HEADERS }
      );
    }

    // Concatenate MP3 byte streams end-to-end
    const totalLength = audioBuffers.reduce((acc, b) => acc + b.byteLength, 0);
    const concatenated = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of audioBuffers) {
      concatenated.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    return new Response(concatenated.buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "TTS synthesis error.";
    return NextResponse.json({ error: msg }, { status: 500, headers: API_RESPONSE_HEADERS });
  }
}
