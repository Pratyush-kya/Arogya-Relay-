export type AgeGroup = "infant" | "child" | "adolescent" | "adult" | "older_adult" | "unknown";

export type Urgency =
  | "emergency"
  | "same_day"
  | "clinician_review"
  | "self_care_information"
  | "insufficient_information";

export type KnowledgeMode = "offline" | "online";

export interface SymptomFacts {
  freeText?: string;
  selectedSymptoms: string[];
  ageGroup?: AgeGroup;
  ageYears?: number;
  pregnant?: boolean;
  durationDays?: number;
  rapidDeterioration?: boolean;
  allergies?: string;
  conditions?: string;
  currentMedicines?: string;
  missingAnswers?: string[];
}

export interface KnowledgeCitation {
  sourceId: string;
  title: string;
  canonicalUrl: string;
  quote?: string;
}

export interface Guidance {
  urgency: Urgency;
  primaryAction: string;
  clinicalRationale: string[];
  dangerSigns: string[];
  homeCareAdvice: string[];
  emergencyNumber?: string;
  citations: KnowledgeCitation[];
  knowledgeMode: KnowledgeMode;
  generatedAt: string;
}

export interface KnowledgeSource {
  sourceId: string;
  title: string;
  publisher: string;
  canonicalUrl: string;
  publicationDate?: string;
  reviewDate?: string;
  jurisdiction?: string;
  population?: string[];
  licence?: string;
  hash: string;
  version: string;
}

export interface KnowledgeChunk {
  chunkId: string;
  sourceId: string;
  section: string;
  anchor: string;
  text: string;
  keywords: string[];
  population?: string[];
}
