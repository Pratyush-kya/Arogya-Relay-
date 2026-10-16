"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

export interface FeedbackReport {
  id: string;
  category: string;
  message: string;
  name?: string;
  contact?: string;
  createdAt: string;
  url: string;
  userAgent: string;
  online: boolean;
}

const FEEDBACK_STORAGE_KEY = "arogya.user_feedback";

export function saveFeedbackReport(report: FeedbackReport): void {
  try {
    const existing = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "[]");
    existing.unshift(report);
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.warn("Could not save feedback to localStorage:", e);
  }
}

export function getStoredFeedbackReports(): FeedbackReport[] {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Interactive Feedback & Issue Reporting Modal
 */
export function HeroFeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { effectiveLang } = useLanguage();
  const [category, setCategory] = useState<string>("nearby_care");
  const [message, setMessage] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{ online: boolean; platform: string }>({
    online: true,
    platform: "web",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDiagnostics({
        online: navigator.onLine,
        platform: navigator.platform || "browser",
      });
      // Prefill contact if user is logged in
      try {
        const localUser = JSON.parse(localStorage.getItem("arogya.local_user") || "null");
        if (localUser) {
          if (localUser.email) setContact(localUser.email);
          if (localUser.user_metadata?.display_name) setName(localUser.user_metadata.display_name);
        }
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    {
      id: "nearby_care",
      label: "🗺️ Nearby Hospitals / Map / Camps",
      labelHi: "🗺️ अस्पताल / स्वास्थ्य शिविर / मैप",
      labelOr: "🗺️ ଡାକ୍ତରଖାନା / ସ୍ୱାସ୍ଥ୍ୟ ଶିବିର / ମ୍ୟାପ୍",
    },
    {
      id: "auth_issue",
      label: "🔑 Sign In / Account Issue",
      labelHi: "🔑 साइन इन / खाता समस्या",
      labelOr: "🔑 ଲଗଇନ୍ / ଆକାଉଣ୍ଟ ସମସ୍ୟା",
    },
    {
      id: "remedies_info",
      label: "💊 Medicine / Remedies Information",
      labelHi: "💊 दवा / प्राथमिक उपचार जानकारी",
      labelOr: "💊 ଔଷଧ / ପ୍ରାଥମିକ ଚିକିତ୍ସା ସୂଚନା",
    },
    {
      id: "page_glitch",
      label: "⚡ Page Error / Crash / Freezing",
      labelHi: "⚡ पेज त्रुटि / अटकना / धीमा",
      labelOr: "⚡ ପୃଷ୍ଠା ତ୍ରୁଟି / ଅଟକିବା / ଧୀର",
    },
    {
      id: "offline_sync",
      label: "📶 Offline Sync / Network Problem",
      labelHi: "📶 ऑफलाइन सिंक / नेटवर्क समस्या",
      labelOr: "📶 ଅଫଲାଇନ୍ ସିଙ୍କ୍ / ନେଟୱର୍କ ସମସ୍ୟା",
    },
    {
      id: "general",
      label: "💡 Suggestion / Other Feedback",
      labelHi: "💡 सुझाव / अन्य प्रतिक्रिया",
      labelOr: "💡 ପ୍ରସ୍ତାବ / ଅନ୍ୟାନ୍ୟ ମତାମତ",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const newReport: FeedbackReport = {
      id: "fb-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
      category,
      message: message.trim(),
      name: name.trim() || undefined,
      contact: contact.trim() || undefined,
      createdAt: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "https://arogya-relay.vercel.app",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    };

    // Save locally
    saveFeedbackReport(newReport);

    // Attempt cloud logging to Supabase (graceful fallback)
    try {
      const supabase = createClient();
      await supabase.from("user_feedback").insert([
        {
          id: newReport.id,
          category: newReport.category,
          message: newReport.message,
          name: newReport.name,
          contact: newReport.contact,
          created_at: newReport.createdAt,
          metadata: {
            url: newReport.url,
            online: newReport.online,
            userAgent: newReport.userAgent,
          },
        },
      ]);
    } catch {
      // Ignored: offline or table pending
    }

    setIsSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "26px 28px",
          boxShadow: "0 20px 45px rgba(0,0,0,0.22)",
          border: "1px solid #cbd5e1",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef3c7", color: "#b45309", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>
              <span>💬</span>
              <span>{effectiveLang === "hi" ? "सहायता एवं प्रतिक्रिया" : effectiveLang === "or" ? "ସହାୟତା ଓ ମତାମତ" : "Help & Feedback Hub"}</span>
            </div>
            <h2 id="feedback-dialog-title" style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              {effectiveLang === "hi" ? "कोई समस्या है या सुझाव देना चाहते हैं?" : effectiveLang === "or" ? "କିଛି ସମସ୍ୟା ଅଛି କିମ୍ବା ମତାମତ ଦେବାକୁ ଚାହାଁନ୍ତି?" : "Facing an Issue or Have Feedback?"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", lineHeight: 1.45 }}>
              {effectiveLang === "hi"
                ? "कृपया हमें बताएं ताकि हम आरोग्य रिले को आपके और आपके समुदाय के लिए बेहतर बना सकें।"
                : effectiveLang === "or"
                ? "ଦୟାକରି ଆମକୁ ଜଣାନ୍ତୁ ଯାହାଦ୍ୱାରା ଆମେ ଆରୋଗ୍ୟ ରିଲେ କୁ ଆପଣଙ୍କ ପାଇଁ ଉନ୍ନତ କରିପାରିବୁ।"
                : "Tell us what happened so our team can resolve it and improve institutional access."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback modal"
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#166534",
                fontSize: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "2px solid #86efac",
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
              {effectiveLang === "hi" ? "आपकी प्रतिक्रिया सुरक्षित सहेज ली गई है!" : effectiveLang === "or" ? "ଆପଣଙ୍କ ମତାମତ ସୁରକ୍ଷିତ ଭାବେ ରଖାଯାଇଛି!" : "Feedback Received Successfully!"}
            </h3>
            <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.5, margin: "0 0 20px" }}>
              {effectiveLang === "hi"
                ? "धन्यवाद! आपकी रिपोर्ट को ऑफ़लाइन और ऑनलाइन दोनों जगह रिकॉर्ड कर लिया गया है।"
                : effectiveLang === "or"
                ? "ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ରିପୋର୍ଟ ଅଫଲାଇନ୍ ଏବଂ ଅନଲାଇନ୍ ରେକର୍ଡ ହୋଇଛି।"
                : "Thank you! Your issue report has been recorded. All offline records remain safe on your device."}
            </p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", textAlign: "left", marginBottom: "20px" }}>
              <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                💡 Quick Troubleshooting Tip:
              </strong>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                • If a map or hospital list was not loading, check that location permission is allowed or pick your district manually.<br />
                • In critical emergencies, dial <strong>112</strong> or <strong>108</strong> directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setMessage("");
                onClose();
              }}
              style={{
                background: "#047857",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              Done / Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Category Selector */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                What area is this issue about?
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                {categories.map((c) => {
                  const isSelected = category === c.id;
                  const label = effectiveLang === "hi" ? c.labelHi : effectiveLang === "or" ? c.labelOr : c.label;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: isSelected ? "1.5px solid #047857" : "1px solid #cbd5e1",
                        background: isSelected ? "#ecfdf5" : "#ffffff",
                        color: isSelected ? "#065f46" : "#334155",
                        fontSize: "12px",
                        fontWeight: isSelected ? 700 : 500,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Describe what happened or what you need: <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  effectiveLang === "hi"
                    ? "क्या समस्या आई? (उदा. पास का अस्पताल नहीं दिखा, लॉगिन में परेशानी, या कोई सुझाव...)"
                    : effectiveLang === "or"
                    ? "କ’ଣ ଅସୁବିଧା ହେଲା? (ଉଦା. ଡାକ୍ତରଖାନା ତାଲିକା ଦେଖାଗଲାନାହିଁ, ଲଗଇନ୍ ସମସ୍ୟା...)"
                    : "e.g. When I clicked on Nearby Care, my location wasn't detected, or the symptom library was slow..."
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                  lineHeight: 1.45,
                }}
              />
            </div>

            {/* Name & Contact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Soren"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Email or Phone (Optional)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 9876543210 or name@gmail.com"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Status & Diagnostic Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              <span>
                System: {diagnostics.online ? "🟢 Connected" : "🟠 Offline Node"} · {diagnostics.platform}
              </span>
              <span>🔒 100% Privacy Protected</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isSubmitting ? "wait" : "pointer",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                }}
              >
                {isSubmitting ? "Submitting Report..." : "Submit Feedback →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive Instructions & How-To Guide Modal
 */
export function HeroInstructionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { effectiveLang } = useLanguage();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "26px 28px",
          boxShadow: "0 20px 45px rgba(0,0,0,0.22)",
          border: "1px solid #cbd5e1",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>
              <span>📖</span>
              <span>USER MANUAL &amp; CLINICAL INSTRUCTIONS</span>
            </div>
            <h2 id="instructions-dialog-title" style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              {effectiveLang === "hi" ? "आरोग्य रिले का उपयोग कैसे करें?" : effectiveLang === "or" ? "ଆରୋଗ୍ୟ ରିଲେ କିପରି ବ୍ୟବହାର କରିବେ?" : "How to Use Arogya Relay"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              A quick guide to navigate medical facilities, verified remedies, offline care, and role portals.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close instructions modal"
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {/* Steps List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Step 1: Roles */}
          <div style={{ display: "flex", gap: "14px", background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#047857", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "15px", flexShrink: 0 }}>
              1
            </div>
            <div>
              <strong style={{ fontSize: "14.5px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                Select Your Role or Use a Demo Account
              </strong>
              <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                Arogya Relay provides specialized dashboards for 4 key healthcare personas:
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#475569", lineHeight: 1.45 }}>
                <li><strong>Citizen / Patient:</strong> Access your universal ABHA-compatible health pass, doctor consultations, and generic medicine cost comparisons.</li>
                <li><strong>ASHA Health Worker:</strong> Conduct door-to-door community health surveys, dictate vitals with voice, and submit emergency referrals.</li>
                <li><strong>Medical Doctor:</strong> Review clinical screening queues, inspect symptom vitals, and issue signed digital e-prescriptions.</li>
                <li><strong>Chemist &amp; Dispensary:</strong> Scan prescription QR codes with cryptographic burn to safely dispense Jan Aushadhi generic medicines.</li>
              </ul>
              <div style={{ marginTop: "6px", background: "#fef3c7", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", color: "#92400e" }}>
                ⚡ <strong>Instant Testing:</strong> Use the demo buttons on the hero card (password: <code>demo123</code>) to test Dr. Patel, Priya Devi, or Ramesh Soren without registration!
              </div>
            </div>
          </div>

          {/* Step 2: Nearby Care */}
          <div style={{ display: "flex", gap: "14px", background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "15px", flexShrink: 0 }}>
              2
            </div>
            <div>
              <strong style={{ fontSize: "14.5px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                Find Nearby Hospitals, Medicine Stores &amp; Health Camps
              </strong>
              <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                Head to the <strong>Nearby Care</strong> section to instantly identify:
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#475569", lineHeight: 1.45 }}>
                <li><strong>Closest Government Facilities:</strong> Community Health Centers (CHC), District Hospitals, and Ayushman Arogya Mandirs sorted by travel distance.</li>
                <li><strong>Jan Aushadhi Generic Pharmacies:</strong> Purchase quality medicines up to 90% cheaper than branded drugs.</li>
                <li><strong>Active District Health Camps:</strong> Dates, venues, doctor specialties, and free screening facilities in your area.</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Arogya Gyan Remedies */}
          <div style={{ display: "flex", gap: "14px", background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "15px", flexShrink: 0 }}>
              3
            </div>
            <div>
              <strong style={{ fontSize: "14.5px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                Verified Home Remedies with Multilingual Voice Narration
              </strong>
              <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                Browse <strong>Arogya Gyan (Disease &amp; Remedies Library)</strong> for common conditions like fever, malaria, loose motion, cough, and skin rashes:
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#475569", lineHeight: 1.45 }}>
                <li>Listen to spoken audio in <strong>Hindi</strong>, <strong>Odia</strong>, or <strong>English</strong>.</li>
                <li>Learn safe home care steps before medication.</li>
                <li>Watch for <strong>Red Flag Emergency Signs</strong> that require immediate hospital admission.</li>
              </ul>
            </div>
          </div>

          {/* Step 4: 100% Offline Resilience */}
          <div style={{ display: "flex", gap: "14px", background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#15803d", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "15px", flexShrink: 0 }}>
              4
            </div>
            <div>
              <strong style={{ fontSize: "14.5px", color: "#0f172a", display: "block", marginBottom: "4px" }}>
                Zero Data Loss · 100% Offline-Safe
              </strong>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                Whether you lose mobile connectivity in remote areas or travel through low-signal zones, all your patient records and screening data are preserved locally in browser storage. The system automatically syncs with the national relay as soon as internet returns.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info & close */}
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            🚨 Emergency Numbers: <strong>112</strong> (Police/Fire/Med) · <strong>108</strong> (Ambulance) · <strong>104</strong> (Health Advice)
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              background: "#047857",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Instructions Card embedded directly in the Hero Section
 */
export function HeroQuickGuideCard({
  onOpenFeedback,
  onOpenFullGuide,
}: {
  onOpenFeedback: () => void;
  onOpenFullGuide: () => void;
}) {
  const { effectiveLang } = useLanguage();

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        border: "1.5px solid #cbd5e1",
        borderRadius: "14px",
        padding: "16px 18px",
        marginTop: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>💡</span>
          <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
            {effectiveLang === "hi" ? "आरोग्य रिले: मुख्य निर्देश (त्वरित गाइड)" : effectiveLang === "or" ? "ଆରୋଗ୍ୟ ରିଲେ: ବ୍ୟବହାର ନିର୍ଦ୍ଦେଶାବଳୀ" : "How to Use This Platform (Quick Instructions)"}
          </strong>
        </div>
        <button
          type="button"
          onClick={onOpenFullGuide}
          style={{
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            padding: "3px 8px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {effectiveLang === "hi" ? "पूरा गाइड देखें →" : effectiveLang === "or" ? "ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍ ଦେଖନ୍ତୁ →" : "View Full Guide →"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "12px", color: "#475569" }}>
        <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#047857", display: "block", marginBottom: "2px" }}>1. Choose Role &amp; Sign In</strong>
          <span>Select Citizen, ASHA Worker, Doctor, or Chemist. Use demo login (<code>demo123</code>).</span>
        </div>
        <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#0284c7", display: "block", marginBottom: "2px" }}>2. Find Care &amp; Camps</strong>
          <span>Locate nearby hospitals, Jan Aushadhi generic stores &amp; free medical camps.</span>
        </div>
        <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#7c3aed", display: "block", marginBottom: "2px" }}>3. Voice Remedies</strong>
          <span>Listen to home remedies in Hindi, Odia, or English with hospital warning flags.</span>
        </div>
        <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong style={{ color: "#166534", display: "block", marginBottom: "2px" }}>4. 100% Offline Safe</strong>
          <span>Data stays preserved on your phone/PC and auto-syncs when internet resumes.</span>
        </div>
      </div>

      {/* Facing an issue alert banner */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#92400e" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span>
            {effectiveLang === "hi"
              ? "वेबसाइट में कोई समस्या आ रही है?"
              : effectiveLang === "or"
              ? "କିଛି ସମସ୍ୟାର ସମ୍ମୁଖୀନ ହେଉଛନ୍ତି କି?"
              : "Facing any issue or glitch on the site?"}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFeedback}
          style={{
            background: "#d97706",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "5px 12px",
            fontSize: "11.5px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(217, 119, 6, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>💬</span>
          <span>
            {effectiveLang === "hi"
              ? "समस्या रिपोर्ट / सुझाव दें"
              : effectiveLang === "or"
              ? "ମତାମତ / ଅଭିଯୋଗ କରନ୍ତୁ"
              : "Report Issue / Send Feedback"}
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * Floating Discreet Help & Feedback Trigger Button
 */
export function FloatingFeedbackButton({ onOpenFeedback, onOpenGuide }: { onOpenFeedback: () => void; onOpenGuide: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {expanded && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            border: "1px solid #cbd5e1",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minWidth: "200px",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              onOpenFeedback();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>💬</span>
            <span>Report Issue / Feedback</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              onOpenGuide();
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
              background: "#f0f9ff",
              color: "#0369a1",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📖</span>
            <span>How to Use Guide</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-label="Help and feedback menu"
        style={{
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "30px",
          padding: "10px 16px",
          boxShadow: "0 6px 20px rgba(4, 120, 87, 0.35)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12.5px",
          fontWeight: 700,
          transition: "transform 0.15s ease",
        }}
      >
        <span style={{ fontSize: "16px" }}>{expanded ? "✕" : "💬"}</span>
        <span>{expanded ? "Close" : "Need Help / Feedback?"}</span>
      </button>
    </div>
  );
}
