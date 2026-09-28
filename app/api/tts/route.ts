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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get("text") ?? "";
  const rawLang = searchParams.get("lang") ?? "en";

  const text = cleanText(rawText, 500);
  if (!text) {
    return NextResponse.json(
      { error: "Text parameter is required." },
      { status: 400, headers: API_RESPONSE_HEADERS }
    );
  }

  const langCode = LANG_MAP[rawLang] ?? "en";

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Upstream TTS synthesis failed." },
        { status: 502, headers: API_RESPONSE_HEADERS }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
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
