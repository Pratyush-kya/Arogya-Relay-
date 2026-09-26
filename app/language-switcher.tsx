"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { IconTooltip } from "./icon-tooltip";

export function LanguageSwitcher() {
  const { lang, setLang, showOriginal, setShowOriginal, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="language-switcher-container" ref={containerRef} style={{ position: "relative" }}>
      <IconTooltip
        title="Multilingual Selector (भाषा चयन)"
        desc="Switch between 8 Indian regional languages. Emergency warnings and clinical terms safely fallback to English if unverified."
        howToUse="Click to choose your regional language."
        position="bottom"
      >
        <button
          type="button"
          className="glass-button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Select Language / भाषा चुनें"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 600,
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            border: "1px solid rgba(23, 100, 79, 0.25)",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "14px" }}>🌐</span>
          <span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 500 }}>Lang:</span>
          <span style={{ color: "var(--ink, #1e293b)" }}>{activeLang.nativeName}</span>
          <span style={{ fontSize: "10.5px", color: "#64748b" }}>({activeLang.englishName})</span>
          <span style={{ fontSize: "9px", opacity: 0.7 }}>▼</span>
        </button>
      </IconTooltip>

      {isOpen && (
        <div
          role="menu"
          aria-label="Languages"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 1000,
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.18)",
            border: "1px solid rgba(23, 100, 79, 0.18)",
            padding: "10px",
            minWidth: "280px",
            display: "grid",
            gap: "6px",
          }}
        >
          <div
            style={{
              padding: "4px 8px 6px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--sc-accent, #17644f)",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Choose Language ({LANGUAGES.length})</span>
            <span style={{ fontSize: "9.5px", color: "#64748b", textTransform: "none", fontWeight: 500 }}>Offline Ready</span>
          </div>

          {/* Medical Translation Disclaimer for blank/untranslated keys */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "7px 9px",
              fontSize: "10px",
              color: "#166534",
              lineHeight: 1.35,
            }}
          >
            <strong>ℹ️ Translation Safety Standard:</strong>
            <p style={{ margin: "2px 0 0", color: "#374151", fontSize: "9.5px" }}>
              If any clinical term or question is blank in a local dialect, it automatically falls back to verified English to prevent medical misinterpretation.
            </p>
          </div>

          <div style={{ display: "grid", gap: "3px", maxHeight: "250px", overflowY: "auto", paddingRight: "2px" }}>
            {LANGUAGES.map((l) => {
              const isSelected = l.code === lang;
              const isComplete = l.packStatus === "complete";
              return (
                <button
                  key={l.code}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: isSelected ? "1px solid rgba(23, 100, 79, 0.3)" : "1px solid transparent",
                    background: isSelected ? "rgba(23, 100, 79, 0.08)" : "transparent",
                    color: isSelected ? "var(--sc-accent, #17644f)" : "#1e293b",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "12.5px" }}>{l.nativeName}</span>
                    <span style={{ fontSize: "10px", opacity: 0.7 }}>{l.englishName}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: isComplete ? "#dcfce7" : "#fef3c7",
                        color: isComplete ? "#15803d" : "#b45309",
                        display: "inline-block",
                      }}
                    >
                      {isComplete ? "✓ Complete" : "⚡ Fallback Active"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {lang !== "en" && (
            <div
              style={{
                marginTop: "4px",
                paddingTop: "6px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: "6px",
                paddingRight: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "10.5px",
                  color: "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <input
                  type="checkbox"
                  checked={showOriginal}
                  onChange={(e) => setShowOriginal(e.target.checked)}
                  style={{ accentColor: "var(--sc-accent, #17644f)" }}
                />
                Show original English alongside translation
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
