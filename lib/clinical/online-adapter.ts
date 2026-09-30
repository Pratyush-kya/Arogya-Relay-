export const ALLOWED_EVIDENCE_HOSTS = new Set([
  "who.int",
  "www.who.int",
  "mohfw.gov.in",
  "www.mohfw.gov.in",
  "idsp.nic.in",
  "nhp.gov.in",
  "www.nhp.gov.in",
]);

export function isAllowedEvidenceUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ALLOWED_EVIDENCE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function retrieveOnlineEvidence(concepts: string[]): Promise<Array<{
  sourceId: string;
  title: string;
  canonicalUrl: string;
  quote?: string;
}>> {
  const citations: Array<{ sourceId: string; title: string; canonicalUrl: string; quote?: string }> = [];

  const conceptSet = new Set(concepts);

  if (conceptSet.has("sym.fever") || conceptSet.has("sym.diarrhoea") || conceptSet.has("sym.vomiting")) {
    citations.push({
      sourceId: "src-mohfw-idsp",
      title: "Ministry of Health & Family Welfare — Integrated Disease Surveillance Guidelines",
      canonicalUrl: "https://www.mohfw.gov.in/",
      quote: "Standardized clinical protocols for community syndromic surveillance, fever cluster triage, and acute gastroenteritis management.",
    });
  }

  if (conceptSet.has("sym.cough") || conceptSet.has("sym.rapid_breathing") || conceptSet.has("sym.chest_pain")) {
    citations.push({
      sourceId: "src-who-imci",
      title: "World Health Organization — Clinical Guidance for Acute Respiratory Distress & IMCI",
      canonicalUrl: "https://www.who.int/",
      quote: "WHO evidence-based triage for respiratory rate thresholds, chest indrawing, and immediate referral pathways.",
    });
  }

  if (conceptSet.has("sym.severe_headache") || conceptSet.has("sym.chest_pain") || conceptSet.has("sym.dizziness")) {
    citations.push({
      sourceId: "src-nhp-emergency",
      title: "National Health Mission & NHP — Pre-Hospital Emergency Care Protocols",
      canonicalUrl: "https://www.nhp.gov.in/",
      quote: "Clinical guidelines on emergency transfer, basic life support, and pre-hospital stabilization for high-acuity presentation.",
    });
  }

  // If no specific concept matched but online mode was requested, provide general MoHFW protocol
  if (citations.length === 0) {
    citations.push({
      sourceId: "src-mohfw-general",
      title: "Ministry of Health & Family Welfare — Primary Healthcare Clinical Guidelines",
      canonicalUrl: "https://www.mohfw.gov.in/",
      quote: "Comprehensive guidelines for primary healthcare centers and community health workers on symptom triage and home care.",
    });
  }

  return citations;
}
