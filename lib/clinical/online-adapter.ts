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

export async function retrieveOnlineEvidence(_concepts: string[]): Promise<unknown[]> {
  // Safe offline default
  return [];
}
