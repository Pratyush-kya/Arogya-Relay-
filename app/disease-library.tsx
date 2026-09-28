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

          return (
            <div
              key={item.id}
              className="disease-card"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "32px", lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>{item.name}</h3>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>{item.hindiName}</span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    background: `${urgencyColor}20`,
                    color: urgencyColor,
                    border: `1px solid ${urgencyColor}40`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.urgency}
                </span>
              </div>

              {/* Quick Idea: In Plain Words Box */}
              <div
                style={{
                  background: "var(--surface-muted)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  borderLeft: "3px solid var(--primary)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--primary)" }}>
                    💡 What is this?
                  </strong>
                  <ReadAloud text={item.narrationText} />
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.45", color: "var(--foreground)" }}>
                  {item.narrationText}
                </p>
              </div>

              {/* What to do at home (Quick remedies) */}
              <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <strong style={{ fontSize: "12px", color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                  🌿 What to Do First at Home:
                </strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4" }}>
                  {item.remedies.slice(0, isExpanded ? undefined : 2).map((rem, idx) => (
                    <li key={idx} style={{ marginBottom: "3px" }}>
                      {rem}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Danger signs / Red Flags */}
              <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <strong style={{ fontSize: "12px", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                  🚨 Danger Signs (Go to Hospital If):
                </strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4", color: "#7f1d1d" }}>
                  {item.redFlags.slice(0, isExpanded ? undefined : 2).map((rf, idx) => (
                    <li key={idx} style={{ marginBottom: "2px" }}>
                      {rf}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expandable Section for Detailed Clinical OTC & Symptoms */}
              {isExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px", borderTop: "1px dashed var(--line)" }}>
                  {/* Common symptoms */}
                  <div>
                    <strong style={{ fontSize: "12px", color: "var(--muted)" }}>All Recognized Symptoms:</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "12px" }}>
                      {item.symptoms.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* OTC Guidance */}
                  <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                    <strong style={{ fontSize: "12px", color: "#1e40af" }}>💊 OTC Medication Guidelines:</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "12px" }}>
                      {item.otcGuidance.map((otc, idx) => (
                        <li key={idx}>{otc}</li>
                      ))}
                    </ul>
                  </div>
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
                  {isExpanded ? "▲ Less Details" : "▼ More Guidance"}
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
