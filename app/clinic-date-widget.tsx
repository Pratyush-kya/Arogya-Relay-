"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/provider";

export function ClinicDateWidget() {
  const { effectiveLang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Operational Shift Determination
  const hour = now.getHours();
  let shiftName = "Morning OPD";
  let shiftTone = "day";
  let shiftIcon = "☀️";

  if (hour >= 8 && hour < 14) {
    shiftName = "Morning OPD";
    shiftTone = "day";
    shiftIcon = "☀️";
  } else if (hour >= 14 && hour < 18) {
    shiftName = "Specialist Tele-Relay";
    shiftTone = "tele";
    shiftIcon = "🩺";
  } else if (hour >= 18 && hour < 21) {
    shiftName = "Evening Triage";
    shiftTone = "evening";
    shiftIcon = "🌆";
  } else {
    shiftName = "Night Triage";
    shiftTone = "night";
    shiftIcon = "🌙";
  }

  // Format parts with safe fallback
  const monthShort = mounted
    ? new Intl.DateTimeFormat(`${effectiveLang}-IN`, { month: "short" }).format(now).toUpperCase()
    : "SEP";
  const dayNumber = mounted ? String(now.getDate()) : "27";
  const weekdayLong = mounted
    ? new Intl.DateTimeFormat(`${effectiveLang}-IN`, { weekday: "long" }).format(now)
    : "Sunday";
  const fullDateStr = mounted
    ? new Intl.DateTimeFormat(`${effectiveLang}-IN`, { day: "2-digit", month: "short", year: "numeric" }).format(now)
    : "27 Sep 2026";
  const timeFormatted = mounted
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now)
    : "09:00:00 AM";

  return (
    <div className="clinic-date-container" aria-live="polite">
      <div
        className="clinic-date-widget"
        aria-label={`Current Date: ${fullDateStr}, Time: ${timeFormatted}, Shift: ${shiftName}`}
      >
        {/* Authentic Calendar Leaf Badge */}
        <div className="calendar-leaf" aria-hidden="true">
          <div className="leaf-pins">
            <span className="leaf-pin" />
            <span className="leaf-pin" />
          </div>
          <div className="leaf-header">
            <span suppressHydrationWarning>{monthShort}</span>
          </div>
          <div className="leaf-body">
            <span className="leaf-day" suppressHydrationWarning>{dayNumber}</span>
          </div>
        </div>

        {/* Date, Weekday, Shift & Clock Info */}
        <div className="calendar-details">
          <div className="calendar-top-row">
            <span className="weekday-pill" suppressHydrationWarning>{weekdayLong}</span>
            <span className={`shift-pill shift-${shiftTone}`}>
              <span className="shift-indicator" />
              <span>{shiftIcon} {shiftName}</span>
            </span>
          </div>

          <div className="calendar-bottom-row">
            <strong className="date-text" suppressHydrationWarning>{fullDateStr}</strong>
            <span className="time-divider">·</span>
            <span className="live-clock" suppressHydrationWarning>
              <span className="live-dot" />
              {timeFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
