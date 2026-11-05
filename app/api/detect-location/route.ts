import { NextRequest, NextResponse } from "next/server";
import { API_RESPONSE_HEADERS } from "@/lib/http-security";

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "";
    const isPrivate =
      !ip ||
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.");

    const targetUrl = isPrivate ? "https://ipwho.is/" : `https://ipwho.is/${ip}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return NextResponse.json(
          {
            success: true,
            lat: data.latitude,
            lng: data.longitude,
            city: data.city || "Bhubaneswar",
            region: data.region || "Odisha",
            country: data.country || "India",
            postal: data.postal || "751001",
            source: "ip",
          },
          { headers: API_RESPONSE_HEADERS }
        );
      }
    }
  } catch (err) {
    console.warn("Location detection server route fallback triggered:", err);
  }

  // Fallback to regional Odisha hub (Bhubaneswar / Khordha)
  return NextResponse.json(
    {
      success: true,
      lat: 20.2648,
      lng: 85.8281,
      city: "Bhubaneswar",
      region: "Odisha",
      country: "India",
      isFallback: true,
      source: "regional_default",
    },
    { headers: API_RESPONSE_HEADERS }
  );
}
