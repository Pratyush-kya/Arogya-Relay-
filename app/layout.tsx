import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "./robots";
import { LanguageProvider } from "@/lib/i18n/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const TITLE = "Arogya Relay — Offline-First Disease Monitoring for Field Health Workers";
const DESCRIPTION =
  "Arogya Relay is a research prototype interface that helps community health workers in remote, low-connectivity areas record screenings, spot emerging health signals, prioritise follow-ups, and sync reports when the network returns.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Arogya Relay",
  },
  description: DESCRIPTION,
  applicationName: "Arogya Relay",
  keywords: [
    "community health worker",
    "offline-first",
    "disease surveillance",
    "syndromic monitoring",
    "rural health",
    "field screening",
  ],
  authors: [{ name: "Arogya Relay" }],
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Arogya Relay",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1730, height: 909, alt: "Arogya Relay — Care that keeps moving" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Stated on every page: this is a prototype, not a medical device.
  other: {
    "prototype-notice":
      "Research and user-interface prototype. Not a certified medical device. All records shown are fictional demonstration data.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do not lock zoom: pinch-zoom must stay available (WCAG 2.2, 1.4.4).
  maximumScale: 5,
  themeColor: "#0a1a14",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${geistSans.variable} ${geistMono.variable} ${jakartaSans.variable} ${instrumentSerif.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
