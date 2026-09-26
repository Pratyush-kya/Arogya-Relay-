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

  const categories = [
    { id: "all", label: "All Conditions", labelHi: "सभी रोग" },
    { id: "fever", label: "Fever & Vitals", labelHi: "बुखार और संक्रमण" },
    { id: "stomach", label: "Stomach & Digestion", labelHi: "पेट और दस्त" },
    { id: "respiratory", label: "Cough & Breathing", labelHi: "खांसी और सांस" },
    { id: "skin", label: "Skin & Eyes", labelHi: "त्वचा और आंखें" },
    { id: "first_aid", label: "First Aid & Emergencies", labelHi: "प्राथमिक चिकित्सा" },
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
      <header className="page-heading" style={{ marginBottom: "20px" }}>
        <div>
          <span className="eyebrow">AROGYA GYAN · PREDEFINED HEALTH LIBRARY</span>
          <h1>Common Diseases &amp; Home Remedies Library</h1>
          <p>
            Offline-accessible clinical guide for common community conditions, safe household remedies, OTC guidelines,
            and red-flag emergency indicators.
          </p>
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
              }}
            >
              {effectiveLang === "hi" ? cat.labelHi : cat.label}
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
              Try searching with broader terms like &quot;fever&quot;, &quot;rash&quot;, or &quot;pain&quot;.
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
                gap: "14px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "28px" }}>{item.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{item.name}</h3>
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
                  }}
                >
                  {item.urgency}
                </span>
              </div>

              {/* Symptoms Overview */}
              <div>
                <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--muted)" }}>
                  Common Signs &amp; Symptoms
                </strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "13px", lineHeight: "1.4" }}>
                  {item.symptoms.slice(0, isExpanded ? undefined : 2).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: "3px" }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Expandable Section: Remedies, OTC & Red Flags */}
              {isExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px", borderTop: "1px solid var(--line)" }}>
                  {/* Home Remedies */}
                  <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "12px", borderRadius: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "#059669", display: "flex", alignItems: "center", gap: "6px" }}>
                      🌿 Safe Home Remedies &amp; First Aid
                    </strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: "1.45" }}>
                      {item.remedies.map((rem, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>
                          {rem}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* OTC & Safe Guidelines */}
                  <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "12px", borderRadius: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                      💊 OTC Medication Guidelines
                    </strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: "1.45" }}>
                      {item.otcGuidance.map((otc, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>
                          {otc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Red Flags / Danger Signs */}
                  <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <strong style={{ fontSize: "13px", color: "#dc2626", display: "flex", alignItems: "center", gap: "6px" }}>
                      🚨 Red Flags (Seek Immediate Hospital Care)
                    </strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", lineHeight: "1.45" }}>
                      {item.redFlags.map((rf, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>
                          {rf}
                        </li>
                      ))}
                    </ul>
                    {item.urgency === "emergency" && (
                      <div style={{ marginTop: "10px" }}>
                        <a
                          href="tel:112"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            background: "#dc2626",
                            color: "#ffffff",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            textDecoration: "none",
                          }}
                        >
                          📞 Call 112 (National Emergency)
                        </a>
                      </div>
                    )}
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
                  paddingTop: "10px",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    {isExpanded ? "▲ Show Less" : "▼ Remedies & Guidance"}
                  </button>
                  <ReadAloud text={item.narrationText} />
                </div>

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
