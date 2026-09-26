"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";

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
          gap: "6px",
          padding: "6px 11px",
          fontSize: "12px",
          fontWeight: 600,
          background: "rgba(255, 255, 255, 0.8)",
          borderRadius: "8px",
          border: "1px solid rgba(23, 100, 79, 0.2)",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">🌐</span>
        <span>{activeLang.nativeName}</span>
        <span style={{ fontSize: "9px", opacity: 0.7 }}>▼</span>
      </button>

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
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            border: "1px solid rgba(23, 100, 79, 0.15)",
            padding: "8px",
            minWidth: "200px",
            display: "grid",
            gap: "4px",
          }}
        >
          <div
            style={{
              padding: "4px 8px 6px",
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--muted, #64748b)",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            Select Language ({LANGUAGES.length})
          </div>

          <div style={{ display: "grid", gap: "2px", maxHeight: "240px", overflowY: "auto" }}>
            {LANGUAGES.map((l) => {
              const isSelected = l.code === lang;
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
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: isSelected ? "rgba(23, 100, 79, 0.1)" : "transparent",
                    color: isSelected ? "var(--sc-accent, #17644f)" : "#1e293b",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span>{l.nativeName}</span>
                  <span style={{ fontSize: "10px", opacity: 0.65 }}>{l.englishName}</span>
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
                paddingLeft: "8px",
                paddingRight: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "10px",
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
                Show original English
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
