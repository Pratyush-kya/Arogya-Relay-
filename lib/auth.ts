/**
 * PROTOTYPE authorization helper.
 *
 * This is a placeholder for real authentication/authorization. A production
 * system MUST use a vetted identity provider with session management, MFA,
 * and server-side RBAC — not a shared token. The helper here exists only so
 * the prototype can demonstrate role gates (admin ingestion, doctor-only
 * medication orders) and the audit trail. Never treat this as production auth.
 */

import { constantTimeEqual } from "./http-security.ts";

export type Role = "admin" | "doctor" | "health_worker" | "reviewer" | "anon";

interface ResolvedActor {
  role: Role;
  actorId: string;
}

/**
 * Resolve a role from the Authorization header against dev tokens.
 * Real deployments replace this with a verified session/JWT.
 */
export function resolveActor(request: Request): ResolvedActor {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { role: "anon", actorId: "anonymous" };

  const adminToken = process.env.ADMIN_API_TOKEN;
  const doctorToken = process.env.DOCTOR_API_TOKEN;

  // Constant-time comparison so a wrong token cannot be distinguished from a
  // partially-correct one by measuring response timing.
  if (adminToken && constantTimeEqual(token, adminToken)) return { role: "admin", actorId: "admin" };
  if (doctorToken && constantTimeEqual(token, doctorToken)) return { role: "doctor", actorId: "doctor" };

  // Unknown token: treat as unauthenticated rather than guessing a role.
  return { role: "anon", actorId: "anonymous" };
}

/** RBAC gate: true if the actor may perform an action requiring `required`. */
export function hasRole(actor: ResolvedActor, required: Role): boolean {
  if (required === "doctor") {
    return actor.role === "doctor";
  }
  if (required === "admin") {
    return actor.role === "admin";
  }
  const rank: Record<Role, number> = {
    anon: 0,
    health_worker: 1,
    reviewer: 2,
    doctor: 3,
    admin: 4,
  };
  return rank[actor.role] >= rank[required];
}

