/**
 * Arogya Relay read-aloud button (Problem Statement 3).
 *
 * Progressive enhancement: speaks the provided text via the on-device Web
 * Speech API (offline, no upload). Shows a replay and a speed control. If speech
 * is unavailable, it degrades to a no-op with an accessible label so the UI
 * never implies a capability the device lacks.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { canSpeak, speak, stopSpeaking } from "@/lib/i18n/voice";

export function ReadAloud({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { effectiveLang, t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      cancelRef.current();
      setSpeaking(false);
    };
  }, [text]);

  const play = useCallback(() => {
    if (!canSpeak()) return;
    setSpeaking(true);
    cancelRef.current = speak(text, {
      lang: effectiveLang,
      rate,
      onEnd: () => setSpeaking(false),
    });
  }, [text, effectiveLang, rate]);

  const stop = useCallback(() => {
    cancelRef.current();
    stopSpeaking();
    setSpeaking(false);
  }, []);

  if (!canSpeak()) {
    return (
      <span className="read-aloud disabled" aria-disabled="true" title={t("read.unavailableTitle")}>
        🔇 {t("read.unavailable")}
      </span>
    );
  }

  return (
    <span className={`read-aloud ${className ?? ""}`}>
      <button
        type="button"
        className={speaking ? "ra-play active" : "ra-play"}
        aria-pressed={speaking}
        onClick={speaking ? stop : play}
      >
        {speaking ? `⏸ ${t("read.stop")}` : `🔊 ${t("action.readAloud")}`}
      </button>
      <button type="button" className="ra-replay" onClick={play} disabled={speaking} title={t("read.replay")}>
        ↻
      </button>
      <div className="ra-speed-pills" role="group" aria-label={t("read.speed")} style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
        {[1, 1.5, 2].map((s) => (
          <button
            key={s}
            type="button"
            className={rate === s ? "ra-speed-btn active" : "ra-speed-btn"}
            onClick={() => {
              setRate(s);
              if (speaking) {
                stop();
                setTimeout(() => {
                  if (!canSpeak()) return;
                  setSpeaking(true);
                  cancelRef.current = speak(text, {
                    lang: effectiveLang,
                    rate: s,
                    onEnd: () => setSpeaking(false),
                  });
                }, 50);
              }
            }}
            aria-pressed={rate === s}
            title={`${s}x speed`}
            style={{
              padding: "2px 6px",
              fontSize: "11px",
              fontWeight: rate === s ? 700 : 500,
              borderRadius: "4px",
              border: rate === s ? "1px solid var(--primary)" : "1px solid var(--line)",
              background: rate === s ? "var(--primary)" : "var(--surface)",
              color: rate === s ? "#fff" : "var(--foreground)",
              cursor: "pointer",
            }}
          >
            {s}x
          </button>
        ))}
      </div>
    </span>
  );
}

