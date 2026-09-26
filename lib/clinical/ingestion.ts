export interface IngestionInput {
  title: string;
  source: string;
  content: string;
  clinicalDomain?: string;
  version?: string;
}

export interface IngestionResult {
  accepted: boolean;
  manifestId?: string;
  documentId?: string;
  rejectedReason?: string;
  timestamp?: string;
}

export async function ingestDocument(input: IngestionInput): Promise<IngestionResult> {
  if (!input || !input.title?.trim() || !input.content?.trim()) {
    return {
      accepted: false,
      rejectedReason: "Document title and text content are required.",
    };
  }

  // Reject any patient identifiable text patterns (PHI)
  const phiPatterns = [
    /\b(patient\s*name|mrn|aadhaar|ssn|date\s*of\s*birth)\b/i,
    /\b\d{4}\s*\d{4}\s*\d{4}\b/, // Aadhaar pattern
  ];

  for (const pattern of phiPatterns) {
    if (pattern.test(input.content)) {
      return {
        accepted: false,
        rejectedReason: "Document rejected: potential patient-identifiable data (PHI) detected.",
      };
    }
  }

  const documentId = `doc-${Date.now().toString(36)}`;
  const manifestId = `man-${Math.random().toString(36).substring(2, 9)}`;

  return {
    accepted: true,
    documentId,
    manifestId,
    timestamp: new Date().toISOString(),
  };
}
