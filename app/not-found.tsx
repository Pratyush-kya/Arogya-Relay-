import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "64px 24px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>404 — Page Not Found</h2>
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
        The requested clinical or operational view does not exist.
      </p>
      <Link href="/" className="primary-button">
        Return to Field Dashboard
      </Link>
    </div>
  );
}
