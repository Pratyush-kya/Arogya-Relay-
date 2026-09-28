"use client";

import React, { useRef, useState, useEffect } from "react";

export interface IconTooltipProps {
  title: string;
  desc: string;
  howToUse?: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
  badge?: string;
}

interface ComputedPosition {
  top?: string | number;
  bottom?: string | number;
  left?: string | number;
  right?: string | number;
  transform?: string;
  horizontalAlign: "left" | "center" | "right";
  verticalAlign: "top" | "bottom";
}

/**
 * Accessible hover/focus tooltip that dynamically detects viewport boundaries
 * and auto-clamps to prevent overflowing screen margins or clipping off-screen.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [computedStyle, setComputedStyle] = useState<ComputedPosition>({
    horizontalAlign: "center",
    verticalAlign: position === "top" ? "top" : "bottom",
  });

  const calculatePosition = () => {
    if (!containerRef.current || typeof window === "undefined") return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const TOOLTIP_WIDTH = Math.min(280, vw - 24);
    const TOOLTIP_HEIGHT = 120;
    const MARGIN = 12;

    let hAlign: "left" | "center" | "right" = "center";
    let vAlign: "top" | "bottom" = position === "top" ? "top" : "bottom";

    // 1. Horizontal Boundary Check
    if (rect.right + TOOLTIP_WIDTH / 2 > vw - MARGIN) {
      // Near right margin of screen
      hAlign = "right";
    } else if (rect.left - TOOLTIP_WIDTH / 2 < MARGIN) {
      // Near left margin of screen
      hAlign = "left";
    } else {
      hAlign = "center";
    }

    // 2. Vertical Boundary Check
    if (position === "bottom" && rect.bottom + TOOLTIP_HEIGHT > vh - MARGIN) {
      // Flips to top if near bottom edge
      vAlign = "top";
    } else if (position === "top" && rect.top - TOOLTIP_HEIGHT < MARGIN) {
      // Flips to bottom if near top edge
      vAlign = "bottom";
    }

    // 3. Assemble coordinates based on intended position and clamping
    let posStyle: ComputedPosition = { horizontalAlign: hAlign, verticalAlign: vAlign };

    if (position === "right" && rect.right + TOOLTIP_WIDTH < vw - MARGIN) {
      posStyle = {
        left: "calc(100% + 10px)",
        right: "auto",
        top: "50%",
        transform: "translateY(-50%)",
        horizontalAlign: "left",
        verticalAlign: "bottom",
      };
    } else if (position === "left" && rect.left - TOOLTIP_WIDTH > MARGIN) {
      posStyle = {
        right: "calc(100% + 10px)",
        left: "auto",
        top: "50%",
        transform: "translateY(-50%)",
        horizontalAlign: "right",
        verticalAlign: "bottom",
      };
    } else {
      // Top or Bottom (with smart margin clamping)
      if (vAlign === "top") {
        posStyle.bottom = "calc(100% + 8px)";
        posStyle.top = "auto";
      } else {
        posStyle.top = "calc(100% + 8px)";
        posStyle.bottom = "auto";
      }

      if (hAlign === "right") {
        posStyle.right = 0;
        posStyle.left = "auto";
        posStyle.transform = "none";
      } else if (hAlign === "left") {
        posStyle.left = 0;
        posStyle.right = "auto";
        posStyle.transform = "none";
      } else {
        posStyle.left = "50%";
        posStyle.right = "auto";
        posStyle.transform = "translateX(-50%)";
      }
    }

    setComputedStyle(posStyle);
  };

  const handleOpen = () => {
    calculatePosition();
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  // Recalculate on scroll / resize if visible
  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => calculatePosition();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className={`icon-tooltip-container ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`rich-icon-tooltip tooltip-${computedStyle.verticalAlign} tooltip-align-${computedStyle.horizontalAlign}`}
          style={{
            position: "absolute",
            zIndex: 99999,
            pointerEvents: "none",
            minWidth: "200px",
            maxWidth: "min(280px, calc(100vw - 24px))",
            padding: "8px 12px",
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: "10px",
            boxShadow: "0 14px 34px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            fontSize: "11px",
            lineHeight: 1.4,
            textAlign: "left",
            wordBreak: "break-word",
            animation: "tooltipFadeIn 0.15s ease-out forwards",
            top: computedStyle.top,
            bottom: computedStyle.bottom,
            left: computedStyle.left,
            right: computedStyle.right,
            transform: computedStyle.transform,
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
                  whiteSpace: "nowrap",
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
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "10px",
                lineHeight: "1.45",
                display: "block",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  color: "#34d399",
                  fontWeight: 700,
                  display: "inline-block",
                  marginRight: "5px",
                }}
              >
                💡 How to use:
              </span>
              <span style={{ color: "#cbd5e1" }}>{howToUse}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
