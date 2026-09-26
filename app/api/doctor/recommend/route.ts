import { NextRequest, NextResponse } from "next/server";
import { resolveActor, hasRole } from "@/lib/auth";
import { API_RESPONSE_HEADERS, cleanText, inspectJsonRequest } from "@/lib/http-security";

/**
 * POST /api/doctor/recommend — doctor-only signed MedicationRequest.
 *
 * The assistant never creates or approves medications. This endpoint shows the
 * only legal path: a clinician (doctor role) signs an order. RBAC is enforced
 * server-side; all other roles receive 403.
 */
export async function POST(request: NextRequest) {
  const issue = inspectJsonRequest(request);
  if (issue) return NextResponse.json({ error: issue.error }, { status: issue.status, headers: API_RESPONSE_HEADERS });

  const actor = resolveActor(request);
  if (!hasRole(actor, "doctor")) {
    return NextResponse.json(
      { error: "Forbidden: only a doctor may create or approve a medication order." },
      { status: 403, headers: API_RESPONSE_HEADERS },
    );
  }

  let body: { drug?: string; dose?: string; instruction?: string; encounterId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: API_RESPONSE_HEADERS });
  }

  const drug = cleanText(body.drug, 160);
  const dose = cleanText(body.dose, 120);
  const instruction = cleanText(body.instruction, 1000);
  const encounterId = cleanText(body.encounterId, 120);
  if (!drug || !instruction) {
    return NextResponse.json({ error: "A signed order requires drug and instruction." }, { status: 400, headers: API_RESPONSE_HEADERS });
  }

  const signingSecret = process.env.ORDER_SIGNING_SECRET;
  if (!signingSecret || signingSecret.length < 32) {
    return NextResponse.json(
      { error: "Order signing is not configured on this prototype deployment." },
      { status: 503, headers: API_RESPONSE_HEADERS },
    );
  }

  const signedAt = new Date().toISOString();
  const payload = JSON.stringify({ actorId: actor.actorId, drug, dose, instruction, encounterId, signedAt });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const signature = [...new Uint8Array(signed)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return NextResponse.json(
    {
      signed: true,
      signedByDoctorId: actor.actorId,
      drug,
      dose: dose || null,
      instruction,
      signature,
      signedAt,
    },
    { status: 201, headers: API_RESPONSE_HEADERS },
  );
}

