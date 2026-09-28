"use client";

import { useState, useMemo } from "react";
import { DISEASE_CATALOG, type DiseaseRemedy } from "@/lib/library/disease-catalog";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface DiseaseLibraryProps {
  onTransferToScreening?: (symptoms: string[], notes: string) => void;
}

export default function DiseaseLibrary({ onTransferToScreening }: DiseaseLibraryProps) {
  const { effectiveLang } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"quick" | "clinical">("quick");

  const categories = [
    { id: "all", label: "All Conditions", labelHi: "सभी रोग", icon: "🌐" },
    { id: "fever", label: "Fever & Chills", labelHi: "बुखार", icon: "🌡️" },
    { id: "stomach", label: "Stomach & Loose Motion", labelHi: "पेट व दस्त", icon: "🤢" },
    { id: "respiratory", label: "Cough & Cold", labelHi: "खांसी व जुकाम", icon: "🤧" },
    { id: "skin", label: "Skin, Rash & Eyes", labelHi: "त्वचा व दाद", icon: "🩹" },
    { id: "first_aid", label: "First Aid & Urgent", labelHi: "प्राथमिक चिकित्सा", icon: "🚑" },
  ];

  const filteredDiseases = useMemo(() => {
    return DISEASE_CATALOG.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const inName = item.name.toLowerCase().includes(q) || item.hindiName.includes(q);
      const inSymptoms = item.symptoms.some((s) => s.toLowerCase().includes(q));
      const inRemedies = item.remedies.some((r) => r.toLowerCase().includes(q));
      return inName || inSymptoms || inRemedies;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="disease-library-container" style={{ padding: "0 4px" }}>
      <header className="page-heading" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="eyebrow">AROGYA GYAN · PREDEFINED HEALTH LIBRARY</span>
          <h1>Common Diseases &amp; Home Remedies Library</h1>
          <p>
            {viewMode === "quick"
              ? "Simple, easy-to-understand health guides with safe home remedies and warning signs."
              : "Offline-accessible clinical guide for primary health workers with OTC protocols and red flags."}
          </p>
        </div>

        {/* View Mode Toggle: Quick Idea (Easy) vs Full Clinical */}
        <div className="cg-toggle" role="group" aria-label="Arogya Gyan View Mode">
          <button
            type="button"
            className={viewMode === "quick" ? "active" : ""}
            aria-pressed={viewMode === "quick"}
            onClick={() => setViewMode("quick")}
            style={{ fontWeight: 600, fontSize: "12px" }}
          >
            💡 Quick Idea (Easy)
          </button>
          <button
            type="button"
            className={viewMode === "clinical" ? "active" : ""}
            aria-pressed={viewMode === "clinical"}
            onClick={() => setViewMode("clinical")}
            style={{ fontWeight: 600, fontSize: "12px" }}
          >
            📋 Clinical Details
          </button>
        </div>
      </header>

      {/* Search and Category Filter */}
      <div
        className="filter-bar"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search symptoms (e.g., fever, itching, loose motion, cough)..."
            style={{
              width: "100%",
              padding: "12px 16px 12px 40px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              fontSize: "14px",
              background: "var(--surface-muted)",
              color: "inherit",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.6,
            }}
          >
            🔍
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                background: selectedCategory === cat.id ? "var(--primary)" : "transparent",
                color: selectedCategory === cat.id ? "#ffffff" : "inherit",
                fontSize: "13px",
                fontWeight: selectedCategory === cat.id ? "600" : "normal",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>{cat.icon}</span>
              <span>{effectiveLang === "hi" ? cat.labelHi : cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Disease Cards Grid */}
      <div
        className="disease-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {filteredDiseases.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "48px 16px",
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px dashed var(--line)",
            }}
          >
            <p style={{ fontSize: "16px", fontWeight: "500", margin: "0 0 8px" }}>No matching health condition found</p>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
              Try searching with simpler words like &quot;fever&quot;, &quot;rash&quot;, or &quot;pain&quot;.
            </p>
          </div>
        )}

        {filteredDiseases.map((item: DiseaseRemedy) => {
          const isExpanded = expandedId === item.id;
          const urgencyColor =
            item.urgency === "emergency"
              ? "#ef4444"
              : item.urgency === "urgent"
              ? "#f97316"
              : item.urgency === "medium"
              ? "#eab308"
              : "#10b981";

          if (viewMode === "quick") {
            // 💡 QUICK IDEA MODE: Easy, visual, plain-language guidance for patients and families
            return (
              <div
                key={item.id}
                className="disease-card quick-idea-card"
                style={{
                  background: "var(--surface)",
                  border: "2px solid #a7f3d0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.08)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "36px", lineHeight: 1 }}>{item.icon}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "var(--foreground)" }}>
                        {item.name}
                      </h3>
                      <span style={{ fontSize: "14px", color: "var(--primary)", fontWeight: "600" }}>
                        {item.hindiName}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    💡 Quick Idea
                  </span>
                </div>

                {/* 1 Simple Sentence Summary */}
                <div
                  style={{
                    background: "var(--surface-muted)",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    borderLeft: "4px solid #10b981",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#065f46" }}>
                      📢 In Simple Words:
                    </span>
                    <ReadAloud text={item.narrationText} />
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: "var(--foreground)" }}>
                    {item.narrationText}
                  </p>
                </div>

                {/* 3 Things You Can Do at Home */}
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                  }}
                >
                  <strong style={{ fontSize: "13px", color: "#065f46", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    🏡 Safe Things To Do Right Now:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", lineHeight: "1.5", color: "var(--foreground)" }}>
                    {item.remedies.slice(0, 3).map((rem, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>
                        {rem}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Plain Danger Sign */}
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.06)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                  }}
                >
                  <strong style={{ fontSize: "12.5px", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    🚨 See Doctor If:
                  </strong>
                  <p style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.4", color: "#7f1d1d" }}>
                    {item.redFlags[0] ?? "Symptoms do not improve after 48 hours or breathing becomes difficult."}
                  </p>
                </div>

                {/* Action Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginTop: "auto",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("clinical")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    📋 View Medicine Dosages →
                  </button>

                  {onTransferToScreening && (
                    <button
                      type="button"
                      onClick={() =>
                        onTransferToScreening(
                          item.symptoms.slice(0, 3),
                          `Suspected: ${item.name} (${item.hindiName}). Category: ${item.category}`
                        )
                      }
                      className="primary-button"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      ✚ Start Screening
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // 📋 CLINICAL DETAILS MODE: Rigorous clinical guide with OTC dosage protocols and red flags
          return (
            <div
              key={item.id}
              className="disease-card clinical-card"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Clinical Card Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "32px", lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>{item.name}</h3>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {item.hindiName} · Category: <span style={{ textTransform: "capitalize" }}>{item.category.replace("_", " ")}</span>
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    background: `${urgencyColor}20`,
                    color: urgencyColor,
                    border: `1px solid ${urgencyColor}40`,
                    whiteSpace: "nowrap",
                  }}
                >
                  Tier: {item.urgency}
                </span>
              </div>

              {/* Clinical Case Audio & Brief */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-muted)", padding: "8px 12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>
                  Clinical Case Narration:
                </span>
                <ReadAloud text={`Clinical protocol for ${item.name}. ${item.narrationText}`} />
              </div>

              {/* Symptoms Checklist */}
              <div>
                <strong style={{ fontSize: "12px", color: "var(--foreground)", display: "block", marginBottom: "4px" }}>
                  🩺 Recognized Clinical Symptoms:
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {item.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "11.5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "var(--surface-muted)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Standard Regimen & OTC Medication Protocols */}
              <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <strong style={{ fontSize: "12px", color: "#1e40af", display: "block", marginBottom: "4px" }}>
                  💊 Standard OTC Protocol &amp; Dosages:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.45" }}>
                  {item.otcGuidance.map((otc, idx) => (
                    <li key={idx} style={{ marginBottom: "2px" }}>
                      {otc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comprehensive Red Flags */}
              <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
                <strong style={{ fontSize: "12px", color: "#991b1b", display: "block", marginBottom: "4px" }}>
                  🚨 Triage Exclusion &amp; Hospital Referral Criteria:
                </strong>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4", color: "#7f1d1d" }}>
                  {item.redFlags.map((rf, idx) => (
                    <li key={idx} style={{ marginBottom: "2px" }}>
                      {rf}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full Non-Pharmacological Care (Expandable) */}
              {isExpanded && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <strong style={{ fontSize: "12px", color: "#065f46", display: "block", marginBottom: "4px" }}>
                    🌿 Supportive Clinical Regimen:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4" }}>
                    {item.remedies.map((rem, idx) => (
                      <li key={idx} style={{ marginBottom: "2px" }}>
                        {rem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "4px 0",
                  }}
                >
                  {isExpanded ? "▲ Hide Supportive Regimen" : "▼ Supportive Regimen"}
                </button>

                {onTransferToScreening && (
                  <button
                    type="button"
                    onClick={() =>
                      onTransferToScreening(
                        item.symptoms.slice(0, 3),
                        `Suspected: ${item.name} (${item.hindiName}). Category: ${item.category}`
                      )
                    }
                    className="secondary-button"
                    style={{ fontSize: "12px", padding: "4px 10px" }}
                  >
                    ✚ Send to Doctor
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
