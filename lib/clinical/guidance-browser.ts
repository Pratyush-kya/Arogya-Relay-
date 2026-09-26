import type { SymptomFacts, Guidance, Urgency, KnowledgeMode } from "./types";
import { evaluateRules } from "./engine";
import { SOURCE_MAP, KNOWLEDGE_CHUNKS } from "./knowledge-pack";

export const URGENCY_PLAIN: Record<
  Urgency,
  { label: string; tone: "emergency" | "urgent" | "review" | "routine" | "unknown"; description: string }
> = {
  emergency: {
    label: "EMERGENCY — ACTION REQUIRED",
    tone: "emergency",
    description: "Critical red-flag signs detected. Immediate emergency medical transport required.",
  },
  same_day: {
    label: "SAME-DAY CLINICAL EVALUATION",
    tone: "urgent",
    description: "High-risk symptoms or vulnerable population requiring evaluation today at a PHC or clinic.",
  },
  clinician_review: {
    label: "ROUTINE CLINICIAN REVIEW",
    tone: "review",
    description: "Symptoms require examination by a healthcare provider within 24 to 48 hours.",
  },
  self_care_information: {
    label: "HOME CARE & MONITORING",
    tone: "routine",
    description: "Mild low-risk symptoms manageable with rest, hydration, and safe supportive remedies.",
  },
  insufficient_information: {
    label: "MORE DETAILS NEEDED",
    tone: "unknown",
    description: "Please specify symptoms or duration to generate structured clinical guidance.",
  },
};

export function assembleGuidance(
  facts: SymptomFacts,
  opts?: { knowledgeMode?: KnowledgeMode; onlineEvidence?: unknown[] }
): Guidance {
  const evaluation = evaluateRules(facts);
  const citations = evaluation.matchedChunkIds
    .map((chunkId) => {
      const chunk = KNOWLEDGE_CHUNKS.find((c) => c.chunkId === chunkId);
      if (!chunk) return null;
      const source = SOURCE_MAP[chunk.sourceId];
      if (!source) return null;
      return {
        sourceId: source.sourceId,
        title: source.title,
        canonicalUrl: source.canonicalUrl,
        quote: chunk.text,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    urgency: evaluation.urgency,
    primaryAction: evaluation.actions[0] || "Seek clinical advice.",
    clinicalRationale: evaluation.reasons,
    dangerSigns: evaluation.dangerSigns,
    homeCareAdvice: evaluation.homeCare,
    emergencyNumber: evaluation.urgency === "emergency" ? "112" : undefined,
    citations,
    knowledgeMode: opts?.knowledgeMode || "offline",
    generatedAt: new Date().toISOString(),
  };
}
