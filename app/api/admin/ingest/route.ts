import { NextRequest, NextResponse } from "next/server";
import { resolveActor, hasRole } from "@/lib/auth";
import { ingestDocument } from "@/lib/clinical/ingestion";
import { API_RESPONSE_HEADERS, inspectJsonRequest } from "@/lib/http-security";

/**
 * POST /api/admin/ingest  — RBAC-gated knowledge ingestion.
 *
 * Only an admin (and, where configured, a reviewer) may add a source to the
 * knowledge pack. Every accepted document produces an append-only manifest and
 * is recorded for clinician review. Patient-derived or identifiable documents
 * are rejected. No model is trained.
 */
export async function POST(request: NextRequest) {
  // Base64 expands input by ~4/3; keep the HTTP ceiling only slightly above
  // the ingestion pipeline's reviewed 20 MB decoded limit.
  const issue = inspectJsonRequest(request, 28_000_000);
  if (issue) return NextResponse.json({ error: issue.error }, { status: issue.status, headers: API_RESPONSE_HEADERS });

  const actor = resolveActor(request);
  if (!hasRole(actor, "admin")) {
    return NextResponse.json({ error: "Forbidden: admin role required." }, { status: 403, headers: API_RESPONSE_HEADERS });
  }

  let body: Parameters<typeof ingestDocument>[0];
  try {
    body = (await request.json()) as Parameters<typeof ingestDocument>[0];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: API_RESPONSE_HEADERS });
  }

  const result = await ingestDocument(body);
  if (!result.accepted) {
    return NextResponse.json(
      { accepted: false, rejectedReason: result.rejectedReason },
      { status: 422, headers: API_RESPONSE_HEADERS },
    );
  }

  return NextResponse.json({ ...result, accepted: true }, { status: 201, headers: API_RESPONSE_HEADERS });
}

