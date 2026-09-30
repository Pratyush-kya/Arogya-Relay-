"use client";

import { useState, useMemo } from "react";
import { DISEASE_CATALOG, type DiseaseRemedy } from "@/lib/library/disease-catalog";
import { useLanguage } from "@/lib/i18n/provider";
import { ReadAloud } from "./read-aloud";

interface DiseaseLibraryProps {
  onTransferToScreening?: (symptoms: string[], notes: string) => void;
  onClose?: () => void;
}

export default function DiseaseLibrary({ onTransferToScreening, onClose }: DiseaseLibraryProps) {
  const { effectiveLang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"quick" | "clinical">("quick");

  const categories = [
    { id: "all", label: "All Conditions", labelHi: "सभी रोग", labelOr: "ସମସ୍ତ ରୋଗ", icon: "🌐" },
    { id: "fever", label: "Fever & Chills", labelHi: "बुखार", labelOr: "ଜ୍ୱର", icon: "🌡️" },
    { id: "stomach", label: "Stomach & Loose Motion", labelHi: "पेट व दस्त", labelOr: "ପେଟ ଓ ଝାଡ଼ା", icon: "🤢" },
    { id: "respiratory", label: "Cough & Cold", labelHi: "खांसी व जुकाम", labelOr: "କାଶ ଓ ଥଣ୍ଡା", icon: "🤧" },
    { id: "skin", label: "Skin, Rash & Eyes", labelHi: "त्वचा व दाद", labelOr: "ଚର୍ମ ଓ ଦାଦ", icon: "🩹" },
    { id: "first_aid", label: "First Aid & Urgent", labelHi: "प्राथमिक चिकित्सा", labelOr: "ପ୍ରାଥମିକ ଚିକିତ୍ସା", icon: "🚑" },
  ];

  const getCategoryLabel = (cat: typeof categories[0]) => {
    if (effectiveLang === "hi") return cat.labelHi;
    if (effectiveLang === "or") return cat.labelOr;
    return cat.label;
  };

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
      {/* Top Header with Close and View Mode Controls */}
      <header
        className="page-heading"
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span className="eyebrow">{t("nav.library").toUpperCase()} · AROGYA GYAN</span>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span>{t("library.heading")}</span>
          </h1>
          <p>
            {viewMode === "quick"
              ? t("library.quickSubtitle")
              : t("library.clinicalSubtitle")}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* View Mode Toggle: Quick Idea (Easy) vs Full Clinical */}
          <div className="cg-toggle" role="group" aria-label="Arogya Gyan View Mode">
            <button
              type="button"
              className={viewMode === "quick" ? "active" : ""}
              aria-pressed={viewMode === "quick"}
              onClick={() => {
                setViewMode("quick");
                setExpandedId(null);
              }}
              style={{ fontWeight: 600, fontSize: "12px" }}
            >
              {t("library.quickMode")}
            </button>
            <button
              type="button"
              className={viewMode === "clinical" ? "active" : ""}
              aria-pressed={viewMode === "clinical"}
              onClick={() => setViewMode("clinical")}
              style={{ fontWeight: 600, fontSize: "12px" }}
            >
              {t("library.clinicalMode")}
            </button>
          </div>

          {/* Close Library / Back to Dashboard Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
              style={{
                fontSize: "12px",
                padding: "8px 14px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
              title={t("library.backDashboard")}
            >
              <span>✕</span>
              <span>{t("library.backDashboard")}</span>
            </button>
          )}
        </div>
      </header>

      {/* Active Expansion Notice Bar if an item is expanded */}
      {expandedId && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#065f46" }}>
            <span style={{ fontSize: "16px" }}>🔍</span>
            <span>
              Currently viewing expanded details for:{" "}
              <strong>{DISEASE_CATALOG.find((d) => d.id === expandedId)?.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpandedId(null)}
            style={{
              background: "#047857",
              color: "#ffffff",
              border: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ✕ Close Expanded Details
          </button>
        </div>
      )}

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

          // Full narration text that completely reads the entire disease advice without stopping
          const fullAudioGuide =
            language === "hi"
              ? `${item.hindiName}। सारांश: ${item.narrationText}। सुरक्षित घरेलू उपाय: ${item.remedies.join("। ")}। खतरे के संकेत: ${item.redFlags.join("। ")}। दवा और खुराक: ${item.otcGuidance.join("। ")}।`
              : `${item.name}. Overview: ${item.narrationText}. Safe home remedies: ${item.remedies.join(". ")}. Warning signs: ${item.redFlags.join(". ")}. Standard medicine protocol: ${item.otcGuidance.join(". ")}.`;

          if (viewMode === "quick") {
            // 💡 QUICK IDEA MODE
            return (
              <div
                key={item.id}
                className="disease-card quick-idea-card"
                style={{
                  background: "var(--surface)",
                  border: isExpanded ? "2px solid #059669" : "2px solid #a7f3d0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: isExpanded
                    ? "0 6px 20px rgba(5, 150, 105, 0.18)"
                    : "0 4px 14px rgba(16, 185, 129, 0.08)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "36px", lineHeight: 1 }}>{item.icon}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "var(--foreground)" }}>
                        {language === "hi" ? item.hindiName : item.name}
                      </h3>
                      <span style={{ fontSize: "14px", color: "var(--primary)", fontWeight: "600" }}>
                        {language === "hi" ? item.name : item.hindiName}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background: "#ecfdf5",
                        color: "#047857",
                        border: "1px solid #a7f3d0",
                      }}
                    >
                      {t("library.quickMode")}
                    </span>
                    {isExpanded && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          borderRadius: "12px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Close / Collapse this card"
                      >
                        ✕ {t("library.closeDetails")}
                      </button>
                    )}
                  </div>
                </div>

                {/* 1 Simple Sentence Summary with Read Aloud */}
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
                      {t("library.inSimpleWords")}
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
                    {t("library.safeHomeCare")}
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
                    {t("library.seeDoctorIf")}
                  </strong>
                  <p style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.4", color: "#7f1d1d" }}>
                    {item.redFlags[0] ?? "Symptoms do not improve after 48 hours or breathing becomes difficult."}
                  </p>
                </div>

                {/* EXPANDED SECTION INSIDE QUICK IDEA */}
                {isExpanded && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    {/* Expanded Header with Close Option */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{t("library.fullDetails")}</span>
                      </strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ReadAloud text={fullAudioGuide} />
                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #f87171",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {t("library.closeDetails")}
                        </button>
                      </div>
                    </div>

                    {/* All Recognized Symptoms */}
                    <div>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "4px" }}>
                        {t("library.recognizedSymptoms")}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {item.symptoms.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "11px",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "#e2e8f0",
                              color: "#1e293b",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Standard OTC Medication Protocols & Dosages */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <strong style={{ fontSize: "12px", color: "#1e40af", display: "block", marginBottom: "4px" }}>
                        {t("library.otcGuidance")}
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.45", color: "#1e293b" }}>
                        {item.otcGuidance.map((otc, idx) => (
                          <li key={idx} style={{ marginBottom: "3px" }}>
                            {otc}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Full Hospital Referral Criteria */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <strong style={{ fontSize: "12px", color: "#991b1b", display: "block", marginBottom: "4px" }}>
                        {t("library.hospitalReferral")}
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4", color: "#991b1b" }}>
                        {item.redFlags.map((rf, idx) => (
                          <li key={idx} style={{ marginBottom: "3px" }}>
                            {rf}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Full Supportive Care Regimen */}
                    <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <strong style={{ fontSize: "12px", color: "#166534", display: "block", marginBottom: "4px" }}>
                        {t("library.allHomeCare")}
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", lineHeight: "1.4", color: "#1e293b" }}>
                        {item.remedies.map((rem, idx) => (
                          <li key={idx} style={{ marginBottom: "3px" }}>
                            {rem}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bottom Close Button */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      style={{
                        padding: "8px 14px",
                        background: "#047857",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>▲ {t("library.closeDetails")}</span>
                    </button>
                  </div>
                )}

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
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{
                      background: isExpanded ? "#f1f5f9" : "none",
                      border: isExpanded ? "1px solid #cbd5e1" : "none",
                      color: isExpanded ? "#475569" : "var(--primary)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{isExpanded ? `▲ ${t("library.closeDetails")}` : t("library.viewDosages")}</span>
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
                      {t("library.startScreening")}
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // 📋 CLINICAL DETAILS MODE
          return (
            <div
              key={item.id}
              className="disease-card clinical-card"
              style={{
                background: "var(--surface)",
                border: isExpanded ? "2px solid var(--primary)" : "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: isExpanded ? "0 4px 16px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Clinical Card Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "32px", lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                      {language === "hi" ? item.hindiName : item.name}
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {language === "hi" ? item.name : item.hindiName} · {getCategoryLabel(item.category)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                  {isExpanded && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        borderRadius: "10px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      title="Collapse details"
                    >
                      ✕ {t("library.closeDetails")}
                    </button>
                  )}
                </div>
              </div>

              {/* Clinical Case Audio & Brief */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-muted)", padding: "8px 12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>
                  {t("library.inSimpleWords")}
                </span>
                <ReadAloud text={fullAudioGuide} />
              </div>

              {/* Symptoms Checklist */}
              <div>
                <strong style={{ fontSize: "12px", color: "var(--foreground)", display: "block", marginBottom: "4px" }}>
                  {t("library.recognizedSymptoms")}
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
                  {t("library.otcGuidance")}
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
                  {t("library.hospitalReferral")}
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
                <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "12px", color: "#065f46" }}>
                      {t("library.allHomeCare")}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #f87171",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ✕ {t("library.closeDetails")}
                    </button>
                  </div>
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
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{
                      background: isExpanded ? "#f1f5f9" : "none",
                      border: isExpanded ? "1px solid #cbd5e1" : "none",
                      color: "var(--primary)",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {isExpanded ? `▲ ${t("library.closeDetails")}` : t("library.viewDosages")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("quick");
                      setExpandedId(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: "11.5px",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    ← {t("library.quickMode")}
                  </button>
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
                    {t("library.startScreening")}
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
