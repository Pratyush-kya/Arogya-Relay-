"use client";

import React, { useState } from "react";

export interface IconTooltipProps {
  title: string;
  desc: string;
  howToUse?: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
  badge?: string;
}

/**
 * Accessible hover/focus tooltip that explains what an icon/button is
 * and gives a concise description of how to use it.
 */
export function IconTooltip({
  title,
  desc,
  howToUse,
  position = "bottom",
  children,
  className = "",
  badge,
}: IconTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`icon-tooltip-container ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`rich-icon-tooltip tooltip-${position}`}
          style={{
            position: "absolute",
            zIndex: 99999,
            pointerEvents: "none",
            minWidth: "220px",
            maxWidth: "280px",
            padding: "8px 12px",
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            fontSize: "11px",
            lineHeight: 1.4,
            textAlign: "left",
            animation: "tooltipFadeIn 0.15s ease-out forwards",
            ...(position === "right" && { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" }),
            ...(position === "left" && { right: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" }),
            ...(position === "bottom" && { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }),
            ...(position === "top" && { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              marginBottom: "3px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "4px",
            }}
          >
            <strong style={{ fontSize: "11.5px", color: "#38bdf8", fontWeight: 700 }}>{title}</strong>
            {badge && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: "rgba(56, 189, 248, 0.2)",
                  color: "#7dd3fc",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: "11px", marginBottom: howToUse ? "4px" : "0" }}>
            {desc}
          </div>
          {howToUse && (
            <div
              style={{
                fontSize: "9.5px",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                paddingTop: "3px",
              }}
            >
              <span style={{ color: "#34d399", fontWeight: 700 }}>💡 How to use:</span>
              <span>{howToUse}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
