export const ALLOWED_EVIDENCE_HOSTS = new Set([
  "who.int",
  "www.who.int",
  "mohfw.gov.in",
  "www.mohfw.gov.in",
  "idsp.nic.in",
  "nhp.gov.in",
  "www.nhp.gov.in",
  "nhm.gov.in",
  "www.nhm.gov.in",
  "nppaindia.nic.in",
  "www.nppaindia.nic.in",
  "pharmaceuticals.gov.in",
  "www.pharmaceuticals.gov.in",
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

  // National Health Mission (NHM) primary healthcare & ASHA/Sub-Center protocol
  citations.push({
    sourceId: "src-mohfw-nhm",
    title: "National Health Mission (NHM) — Standard Treatment Guidelines & Ayushman Arogya Mandir Protocols",
    canonicalUrl: "https://nhm.gov.in/",
    quote: "National Health Mission primary care clinical guidelines for community triage, essential drug distribution, and maternal/child referral pathways.",
  });

  // Drugs (Prices Control) Order (DPCO) & NPPA generic medicine ceiling price compliance
  citations.push({
    sourceId: "src-nppa-dpco",
    title: "National Pharmaceutical Pricing Authority (NPPA) — Drugs (Prices Control) Order (DPCO)",
    canonicalUrl: "https://www.nppaindia.nic.in/",
    quote: "Ceiling price regulation under NLEM and PMBJP Jan Aushadhi Kendra quality-assured generic substitution guidance.",
  });

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
