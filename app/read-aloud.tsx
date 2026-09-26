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

  useEffect(() => () => cancelRef.current(), []);

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
      <label className="ra-speed">
        {t("read.speed")}
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.25}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          aria-label={`${t("action.readAloud")} ${t("read.speed")}`}
        />
      </label>
    </span>
  );
}

