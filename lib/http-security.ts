import type { NextRequest } from "next/server";

export const API_RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(self), microphone=(self), camera=(self)",
};

export function cleanText(input: unknown, maxLen = 1000): string {
  if (typeof input !== "string") return "";
  // Remove control characters except newline and tab
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.slice(0, maxLen);
}

export function inspectJsonRequest(request: NextRequest): { error: string; status: number } | null {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { error: "Content-Type must be application/json", status: 415 };
  }
  return null;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

