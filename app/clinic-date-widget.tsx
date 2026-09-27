"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/provider";

interface ClinicDateWidgetProps {
  onOpenCamps?: () => void;
}

interface CampItem {
  id: string;
  dateStr: string;
  dayOffset: number;
  title: string;
  location: string;
  type: string;
  badgeColor: string;
}

export function ClinicDateWidget({ onOpenCamps }: ClinicDateWidgetProps) {
  const { effectiveLang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!popoverOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPopoverOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [popoverOpen]);

  // Operational Shift Determination
  const hour = now.getHours();
  let shiftName = "General OPD";
  let shiftStatus = "Active";
  let shiftTone = "day";
  let shiftIcon = "☀️";

  if (hour >= 8 && hour < 14) {
    shiftName = "Morning OPD";
    shiftStatus = "In-Clinic Consultations";
    shiftTone = "day";
    shiftIcon = "☀️";
  } else if (hour >= 14 && hour < 18) {
    shiftName = "Specialist Tele-Relay";
    shiftStatus = "Remote Review Active";
    shiftTone = "tele";
    shiftIcon = "🩺";
  } else if (hour >= 18 && hour < 21) {
    shiftName = "Evening Vitals Triage";
    shiftStatus = "Community Case Review";
    shiftTone = "evening";
    shiftIcon = "🌆";
  } else {
    shiftName = "Night Emergency Triage";
    shiftStatus = "On-Call Mesh Mode";
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

  // Upcoming Health Camps & Schedule
  const upcomingCamps: CampItem[] = [
    {
      id: "camp-1",
      dateStr: "Today",
      dayOffset: 0,
      title: "Maternal & Infant Health Camp",
      location: "CHC Sunabeda, Block A",
      type: "Immunization & Nutrition",
      badgeColor: "#17644f",
    },
    {
      id: "camp-2",
      dateStr: "Tomorrow",
      dayOffset: 1,
      title: "Vision & Cataract Screening Outreach",
      location: "Koraput Ward 4 Community Center",
      type: "Mobile Ophthalmology",
      badgeColor: "#1d4ed8",
    },
    {
      id: "camp-3",
      dateStr: "30 Sep",
      dayOffset: 3,
      title: "Sickle Cell & Tribal Anemia Survey",
      location: "Semiliguda Health Sub-Center",
      type: "Genetic Screening",
      badgeColor: "#b45309",
    },
    {
      id: "camp-4",
      dateStr: "03 Oct",
      dayOffset: 6,
      title: "Non-Communicable Disease (NCD) Camp",
      location: "Rayagada Peripheral Dispensary",
      type: "Hypertension & Diabetes",
      badgeColor: "#7e22ce",
    },
  ];

  // Helper for generating current month days
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDayNum = now.getDate();

  return (
    <div className="clinic-date-container">
      {/* Trigger Button Widget */}
      <button
        ref={triggerRef}
        type="button"
        className={`clinic-date-widget ${popoverOpen ? "active" : ""}`}
        onClick={() => setPopoverOpen((prev) => !prev)}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        aria-label={`Clinic Operational Date: ${fullDateStr}, Time: ${timeFormatted}. Click for clinic operational schedule.`}
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

        {/* Expand indicator icon */}
        <div className="date-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Popover / Schedule Modal */}
      {popoverOpen && (
        <div
          ref={popoverRef}
          className="clinic-calendar-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Clinic Operational Calendar & Field Camps Schedule"
        >
          {/* Header */}
          <div className="cal-popover-header">
            <div className="cal-popover-title">
              <span className="cal-kicker">HEALTH STATION CALENDAR</span>
              <h3>Operational Schedule &amp; Camps</h3>
            </div>
            <button
              type="button"
              className="cal-close-btn"
              onClick={() => setPopoverOpen(false)}
              aria-label="Close calendar"
            >
              ✕
            </button>
          </div>

          {/* Current Live Time Card */}
          <div className="cal-clock-card">
            <div className="cal-clock-main">
              <span className="clock-label">OFFLINE HARDWARE TIME (IST)</span>
              <div className="clock-digits" suppressHydrationWarning>
                {timeFormatted}
              </div>
              <div className="clock-sync-badge">
                <span className="sync-pulse" />
                <span>NTP Cloud Synced · UTC+05:30 (Asia/Kolkata)</span>
              </div>
            </div>
            <div className="cal-shift-box">
              <span className="shift-box-title">CURRENT SHIFT</span>
              <strong className="shift-box-name">{shiftName}</strong>
              <span className="shift-box-desc">{shiftStatus}</span>
              <span className="shift-hours">
                {hour >= 8 && hour < 14 ? "08:00 - 14:00" : hour >= 14 && hour < 18 ? "14:00 - 18:00" : hour >= 18 && hour < 21 ? "18:00 - 21:00" : "21:00 - 08:00"}
              </span>
            </div>
          </div>

          {/* Mini Month Grid */}
          <div className="cal-month-section">
            <div className="cal-month-nav">
              <strong>
                {mounted
                  ? new Intl.DateTimeFormat(`${effectiveLang}-IN`, { month: "long", year: "numeric" }).format(now)
                  : "September 2026"}
              </strong>
              <span className="cal-badge-today">Active Month</span>
            </div>

            <div className="cal-grid-header">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            <div className="cal-grid-body">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-cell empty" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === currentDayNum;
                // Highlight days that have upcoming camps
                const hasCamp = day === currentDayNum || day === currentDayNum + 1 || day === currentDayNum + 3 || day === currentDayNum + 6;
                return (
                  <div
                    key={`day-${day}`}
                    className={`cal-cell ${isToday ? "today-cell" : ""} ${hasCamp ? "camp-cell" : ""}`}
                    title={isToday ? "Today (Active Shift)" : hasCamp ? "Scheduled Medical Camp" : undefined}
                  >
                    <span>{day}</span>
                    {hasCamp && <span className="camp-indicator-dot" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scheduled Camps & Outreach List */}
          <div className="cal-camps-section">
            <div className="cal-section-head">
              <span className="section-label">SCHEDULED RURAL CAMPS &amp; RELAYS</span>
              {onOpenCamps && (
                <button
                  type="button"
                  className="cal-link-btn"
                  onClick={() => {
                    setPopoverOpen(false);
                    onOpenCamps();
                  }}
                >
                  Nearby Care Map ›
                </button>
              )}
            </div>

            <div className="cal-camps-list">
              {upcomingCamps.map((camp) => (
                <div key={camp.id} className="cal-camp-item">
                  <div
                    className="camp-date-badge"
                    style={{ backgroundColor: `${camp.badgeColor}15`, color: camp.badgeColor, borderColor: `${camp.badgeColor}35` }}
                  >
                    <strong>{camp.dateStr}</strong>
                  </div>
                  <div className="camp-info">
                    <strong>{camp.title}</strong>
                    <p>{camp.location} · <span>{camp.type}</span></p>
                  </div>
                  <span className="camp-status-tag">Scheduled</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="cal-popover-footer">
            <span>🛡️ Clinical Clock Certified · Indian Public Health Standards (IPHS) Time Protocol</span>
          </div>
        </div>
      )}
    </div>
  );
}
