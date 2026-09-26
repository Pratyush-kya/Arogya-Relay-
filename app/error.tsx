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
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
        The system encountered an error. All your offline records are safely preserved locally.
      </p>
      <button type="button" onClick={() => reset()} className="primary-button">
        Try Again
      </button>
    </div>
  );
}
