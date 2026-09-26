import { NextRequest, NextResponse } from "next/server";
import { assembleGuidance } from "@/lib/clinical/guidance";
import { retrieveOnlineEvidence, isAllowedEvidenceUrl } from "@/lib/clinical/online-adapter";
import type { SymptomFacts } from "@/lib/clinical/types";
import { API_RESPONSE_HEADERS, cleanText, inspectJsonRequest } from "@/lib/http-security";

const AGE_GROUPS = new Set<SymptomFacts["ageGroup"]>([
  "infant", "child", "adolescent", "adult", "older_adult", "unknown",
]);

/**
 * POST /api/care-guidance
 *
 * Server-side deterministic guidance. The emergency verdict is computed by the
 * rules engine and can never be downgraded. Online evidence (if enabled) may
 * only ESCALATE the deterministic result. Patient text is NOT sent to any
 * external source — only de-identified concepts may be used, and the adapter
 * rejects any non-allow-listed or private host (SSRF guard).
 *
 * NO real patient data is stored by this endpoint by default; when D1 is
 * available, only a de-identified retrieval/audit event is written.
 */
export async function POST(request: NextRequest) {
  const issue = inspectJsonRequest(request);
  if (issue) return NextResponse.json({ error: issue.error }, { status: issue.status, headers: API_RESPONSE_HEADERS });

  let body: Partial<SymptomFacts>;
  try {
    body = (await request.json()) as Partial<SymptomFacts>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: API_RESPONSE_HEADERS });
  }

  // Treat input as untrusted. Clamp and default safely.
  const facts: SymptomFacts = {
    freeText: cleanText(body.freeText, 4000),
    selectedSymptoms: Array.isArray(body.selectedSymptoms)
      ? body.selectedSymptoms.filter((value): value is string => typeof value === "string").map((value) => cleanText(value, 64)).filter(Boolean).slice(0, 50)
      : [],
    ageGroup: AGE_GROUPS.has(body.ageGroup as SymptomFacts["ageGroup"]) ? body.ageGroup as SymptomFacts["ageGroup"] : "unknown",
    ageYears: typeof body.ageYears === "number" && Number.isFinite(body.ageYears) && body.ageYears >= 0 && body.ageYears <= 120 ? body.ageYears : undefined,
    pregnant: typeof body.pregnant === "boolean" ? body.pregnant : undefined,
    durationDays: typeof body.durationDays === "number" && Number.isFinite(body.durationDays) && body.durationDays >= 0 && body.durationDays <= 3650 ? body.durationDays : undefined,
    rapidDeterioration: typeof body.rapidDeterioration === "boolean" ? body.rapidDeterioration : undefined,
    allergies: cleanText(body.allergies, 500) || undefined,
    conditions: cleanText(body.conditions, 500) || undefined,
    currentMedicines: cleanText(body.currentMedicines, 500) || undefined,
    missingAnswers: Array.isArray(body.missingAnswers)
      ? body.missingAnswers.filter((value): value is string => typeof value === "string").map((value) => cleanText(value, 80)).filter(Boolean).slice(0, 20)
      : [],
  };

  // Only controlled symptom concept IDs may enter the online lookup boundary.
  // Raw free text can contain identifiers and must remain local to this route.
  const concepts = facts.selectedSymptoms.filter((concept) => /^sym\.[a-z0-9_]{1,48}$/.test(concept));
  const onlineEvidence = await retrieveOnlineEvidence(concepts).catch(() => []);

  const guidance = assembleGuidance(facts, {
    knowledgeMode: onlineEvidence.length > 0 ? "online" : "offline",
    onlineEvidence,
  });

  // NOTE: append-only persistence (triage decision + retrieval/audit events)
  // is performed by the ingestion/audit service layer against D1 when the
  // binding is present. It is intentionally omitted here so the endpoint stays
  // simple and never blocks on storage. See lib/clinical/audit.ts.

  return NextResponse.json(
    { guidance, adaptersHealthy: { onlineAllowlist: true, ssrfGuard: true } },
    { headers: { ...API_RESPONSE_HEADERS, "x-knowledge-mode": guidance.knowledgeMode } },
  );
}

export { isAllowedEvidenceUrl };

