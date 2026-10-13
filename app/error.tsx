"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div style={{ padding: "48px 24px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Something went wrong</h2>
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
        The system encountered an error. All your offline records are safely preserved locally.
      </p>
      {error && (
        <details open style={{ textAlign: "left", marginBottom: "20px", background: "var(--surface-muted, #f8fafc)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)", fontSize: "12px", color: "#b91c1c" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Technical Error Details</summary>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {error.message || "An unexpected runtime error occurred."}
            {error.digest ? `\nNext.js Digest: ${error.digest}` : ""}
          </pre>
        </details>
      )}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => reset()} className="primary-button">
          Try Again
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              if ("caches" in window) {
                try {
                  caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
                } catch {}
              }
              window.location.href = window.location.origin + "/?t=" + Date.now();
            }
          }}
          className="secondary-button"
        >
          Fresh Reload (Bypass Cache)
        </button>
      </div>
    </div>
  );
}
