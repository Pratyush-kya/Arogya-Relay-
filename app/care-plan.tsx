/**
 * Arogya Relay — Care Plan & Reminder UI (Problem Statement 4).
 *
 * Two views in one tab:
 *  - Doctor editor: author a care plan / medication order, run safety + completeness
 *    checks, sign it (doctor-only). Ambiguous schedules are blocked.
 *  - Patient daily schedule: the signed plan rendered with today's reminders
 *    (upcoming/due/missed/completed), acknowledgement actions, ICS + printable
 *    export, and read-aloud.
 *
 * Uses synthetic demo data only. Doctor role is simulated by a toggle for the
 * prototype; production must enforce RBAC server-side.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

"use client";

import { useMemo, useState } from "react";
import { ReadAloud } from "./read-aloud";
import {
  buildReminders,
  activeTaperStep,
  DEFAULT_MISSED_DOSE_ADVICE,
} from "@/lib/careplan/scheduling.ts";
import {
  assertCanPrescribe,
  AuthorizationError,
  validateOrderCompleteness,
  isSignable,
  findDuplicateActiveOrders,
  allergyConflict,
  missedDoseAdviceFor,
  signOrderPayload,
} from "@/lib/careplan/safety.ts";
import { toICS, PUSH_PRODUCTION_NOTE } from "@/lib/careplan/fhir.ts";
import type {
  CareItem,
  Frequency,
  MedicationOrder,
  PatientRef,
  Practitioner,
  Role,
} from "@/lib/careplan/types.ts";
import { useLanguage } from "@/lib/i18n/provider";

function mkEmptyOrder(): MedicationOrder {
  const current = new Date();
  const todayStr = current.toISOString().slice(0, 10);
  const nextWeekStr = new Date(current.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  return {
    id: "mo-draft",
    carePlanId: "cp-active",
    patientId: "pt-current",
    medicine: "",
    strength: "",
    form: "tablet",
    dose: "1 tablet",
    route: "oral",
    frequency: { kind: "times_per_day", times: 2 },
    foodRelation: "after_food",
    indication: "",
    instructions: "Take with water after food.",
    startDate: todayStr,
    endDate: nextWeekStr,
    highRisk: false,
    signedByDoctorId: null,
    signedAt: null,
    signature: null,
    status: "draft",
    createdAt: current.toISOString(),
    updatedAt: current.toISOString(),
    version: 1,
  };
}

const FREQ_OPTIONS: { value: Frequency["kind"]; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "times_per_day", label: "Times per day" },
  { value: "every_hours", label: "Every N hours" },
  { value: "weekdays", label: "Specific weekdays" },
  { value: "interval", label: "Every N days" },
  { value: "prn", label: "As needed (PRN)" },
  { value: "ambiguous", label: "Ambiguous (blocked)" },
];

export default function CarePlanView() {
  const { t } = useLanguage();
  const [role, setRole] = useState<Role>("doctor");
  const [now, setNow] = useState(() => new Date().toISOString().slice(0, 16));
  const today = now.slice(0, 10);

  const [patientRef, setPatientRef] = useState("NR-1001");
  const [doctor] = useState<Practitioner>({
    id: "dr-001",
    role: "doctor",
    displayName: "Dr. Clinician",
    regNo: "RMP-IN-2026",
  });

  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [items] = useState<CareItem[]>([]);

  // Editor draft order
  const [draft, setDraft] = useState<MedicationOrder>(mkEmptyOrder);
  const [signMsg, setSignMsg] = useState<string | null>(null);

  const currentPatient: PatientRef = useMemo(
    () => ({
      id: `pt-${patientRef}`,
      reference: patientRef,
      ageGroup: "adult",
      pregnant: false,
      allergies: [],
    }),
    [patientRef]
  );

  const issues = useMemo(() => validateOrderCompleteness(draft), [draft]);
  const blocking = issues.filter((i) => i.severity === "blocking");
  const dups = useMemo(() => findDuplicateActiveOrders(orders, draft), [draft, orders]);
  const allergy = useMemo(() => allergyConflict(draft, currentPatient), [draft, currentPatient]);

  const windowStart = `${today}T00:00:00`;
  const windowEnd = `${today}T23:59:59`;
  const reminders = useMemo(
    () => buildReminders({ orders, items, windowStart, windowEnd, now }),
    [orders, items, windowStart, windowEnd, now],
  );

  const sign = () => {
    try {
      assertCanPrescribe({ id: doctor.id, role });
      if (!isSignable(draft)) {
        setSignMsg("Cannot sign: resolve blocking issues first.");
        return;
      }
      const signed: MedicationOrder = {
        ...draft,
        id: `mo-${Date.now().toString(36)}`,
        patientId: currentPatient.id,
        signedByDoctorId: doctor.id,
        signedAt: now,
        signature: signOrderPayload(draft),
        status: "active" as const,
      };
      setDraft(signed);
      setOrders((prev) => [signed, ...prev.filter((o) => o.id !== signed.id)]);
      setSignMsg("Signed by " + doctor.displayName + " (Reg: " + doctor.regNo + ").");
    } catch (e) {
      setSignMsg(e instanceof AuthorizationError ? e.message : "Signing failed.");
    }
  };

  const ics = useMemo(
    () =>
      toICS(
        reminders.map((r) => ({
          title: r.sourceType === "medication" ? "Medicine reminder" : "Care task",
          start: r.dueAt,
        })),
        { genericTitles: true },
      ),
    [reminders],
  );

  return (
    <div className="page-content section-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("plan.kicker")}</span>
          <h1>{t("plan.title")}</h1>
          <p>{t("plan.subtitle")}</p>
        </div>
        <div className="cg-toggle" role="group" aria-label="View role">
          <button type="button" className={role === "doctor" ? "active" : ""} aria-pressed={role === "doctor"} onClick={() => setRole("doctor")}>{t("plan.doctor")}</button>
          <button type="button" className={role === "patient" ? "active" : ""} aria-pressed={role === "patient"} onClick={() => setRole("patient")}>{t("plan.patient")}</button>
        </div>
      </div>

      {role === "doctor" ? (
        <section className="cg-card cp-editor">
          <header className="cp-editor-head">
            <div>
              <span className="eyebrow">{t("plan.clinicianWorkspace")}</span>
              <h2>{t("plan.editor")}</h2>
              <p>{t("plan.editorHelp")}</p>
            </div>
            <span className="cp-draft-status"><i /> {t("plan.draftOrder")}</span>
          </header>

          <div className="cp-grid">
            <label>{t("plan.medicine")}
              <input value={draft.medicine} onChange={(e) => setDraft({ ...draft, medicine: e.target.value })} />
            </label>
            <label>{t("plan.strength")}
              <input value={draft.strength} onChange={(e) => setDraft({ ...draft, strength: e.target.value })} />
            </label>
            <label>{t("plan.form")}
              <input value={draft.form} onChange={(e) => setDraft({ ...draft, form: e.target.value })} />
            </label>
            <label>{t("plan.dose")}
              <input value={draft.dose} onChange={(e) => setDraft({ ...draft, dose: e.target.value })} />
            </label>
            <label>{t("plan.route")}
              <input value={draft.route} onChange={(e) => setDraft({ ...draft, route: e.target.value })} />
            </label>
            <label>{t("plan.frequency")}
              <select
                value={draft.frequency.kind}
                onChange={(e) => {
                  const kind = e.target.value as Frequency["kind"];
                  const f: Frequency =
                    kind === "times_per_day" ? { kind, times: 2 }
                    : kind === "every_hours" ? { kind, hours: 8 }
                    : kind === "weekdays" ? { kind, days: [1, 3, 5] }
                    : kind === "interval" ? { kind, everyDays: 3 }
                    : kind === "prn" ? { kind }
                    : kind === "once" ? { kind }
                    : { kind };
                  setDraft({ ...draft, frequency: f });
                }}
              >
                {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>{t("plan.food")}
              <select value={draft.foodRelation} onChange={(e) => setDraft({ ...draft, foodRelation: e.target.value as MedicationOrder["foodRelation"] })}>
                <option value="before_food">Before food</option>
                <option value="after_food">After food</option>
                <option value="with_food">With food</option>
                <option value="empty_stomach">Empty stomach</option>
                <option value="any">Any</option>
              </select>
            </label>
            <label>{t("plan.start")}
              <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            </label>
            <label>{t("plan.end")}
              <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
            </label>
          </div>

          <label className="cp-full">{t("plan.indication")}
            <input value={draft.indication} onChange={(e) => setDraft({ ...draft, indication: e.target.value })} />
          </label>
          <label className="cp-full">{t("plan.instructions")}
            <textarea rows={2} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          </label>
          <label className="cp-check">
            <input type="checkbox" checked={draft.highRisk ?? false} onChange={(e) => setDraft({ ...draft, highRisk: e.target.checked })} /> {t("plan.highRisk")}
          </label>

          {/* Safety surface */}
          {(blocking.length > 0 || dups.length > 0 || allergy.length > 0) && (
            <div className="cp-safety" role="alert">
              <strong>{t("plan.safety")}</strong>
              <ul>
                {blocking.map((i, idx) => <li key={idx} className="cp-block">⛔ {i.message}</li>)}
                {dups.map((d) => <li key={d.id} className="cp-warn">⚠ Duplicate active order: {d.medicine}</li>)}
                {allergy.map((a) => <li key={a} className="cp-warn">⚠ Allergy conflict: {a}</li>)}
              </ul>
            </div>
          )}

          <div className="cp-actions">
            <button type="button" className="primary-button" disabled={blocking.length > 0} onClick={sign}>{t("plan.sign")}</button>
            {signMsg && <span className="cp-msg" role="status">{signMsg}</span>}
          </div>
          <p className="cp-note">{draft.status === "active" && draft.signedAt ? `Order signed ${draft.signedAt} · signature ${draft.signature}` : t("plan.unsigned")}</p>
        </section>
      ) : (
        <section className="cg-card">
          <div className="cp-patient-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>{t("plan.schedule")} — {patientRef}</h2>
            <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              Patient Ref:
              <input
                type="text"
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                style={{ width: "120px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
                placeholder="e.g. NR-1001"
              />
            </label>
          </div>
          <div className="cp-now">
            <label>{t("plan.demoClock")}
              <input type="datetime-local" value={now} onChange={(e) => setNow(e.target.value.replace("T", "T") + ":00")} />
            </label>
            <ReadAloud text={"You have " + reminders.length + " reminders today."} />
          </div>

          <ul className="cp-list">
            {reminders.length === 0 && (
              <li className="nc-empty" style={{ padding: "28px 16px", textAlign: "center" }}>
                <strong>{t("plan.noReminders")}</strong>
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Switch to Clinician Workspace to author and sign active medication orders.
                </p>
              </li>
            )}
            {reminders.map((r) => {
              const order = orders.find((o) => o.id === r.sourceId);
              const item = items.find((i) => i.id === r.sourceId);
              const taper = order ? activeTaperStep(order, r.dueAt.slice(0, 10)) : null;
              const advice = order ? missedDoseAdviceFor(order) : DEFAULT_MISSED_DOSE_ADVICE;
              return (
                <li key={r.id} className={`cp-item cp-${r.state}`}>
                  <div className="cp-item-head">
                    <strong>{order ? `${order.medicine} ${order.strength}` : item?.title}</strong>
                    <span className={`cp-badge ${r.state}`}>{r.state}</span>
                  </div>
                  <div className="cp-item-meta">
                    {r.dueAt.slice(11, 16)}
                    {order && ` · ${taper ? taper.dose : order.dose} · ${order.route} · ${order.foodRelation.replace("_", " ")}`}
                    {order && ` · ${order.instructions}`}
                  </div>
                  {order && (
                    <p className="cp-advice">Missed a dose? {advice}</p>
                  )}
                  <div className="cp-item-actions">
                    <button type="button" className="secondary-button">{t("plan.taken")}</button>
                    <button type="button" className="nc-link">{t("plan.snooze")}</button>
                    <button type="button" className="nc-link">{t("plan.skip")}</button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cp-export">
            <button type="button" className="secondary-button" onClick={() => navigator.clipboard?.writeText(ics)}>{t("plan.copyIcs")}</button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>{t("plan.print")}</button>
          </div>

          {/* Jan Aushadhi Generic Pharmacy Stocking Bridge */}
          {orders.length > 0 && (
            <div className="jan-aushadhi-bridge-card">
              <div className="jan-card-header">
                <span className="jan-pill">PMBJP JAN AUSHADHI GENERIC DISPENSER</span>
                <h4>Nearby Generic Medicine Outlets</h4>
                <p>Essential generic formulations matching active prescriptions available at regulated subsidised prices:</p>
              </div>

              <div className="jan-outlets-grid">
                <div className="jan-outlet">
                  <div className="outlet-head">
                    <strong>Pynursla Pradhan Mantri Jan Aushadhi Kendra</strong>
                    <span className="outlet-distance">3.2 km · ~12 min by road</span>
                  </div>
                  <p className="outlet-stock">
                    ✓ In Stock: {orders.map((o) => o.medicine).filter(Boolean).join(", ") || "Essential Generics (Paracetamol, Amoxicillin, ORS)"}
                  </p>
                  <div className="outlet-actions">
                    <a href="tel:+919863000001" className="secondary-button">📞 Call Outlet</a>
                    <span className="price-tag">Up to 80% Subsidy</span>
                  </div>
                </div>

                <div className="jan-outlet">
                  <div className="outlet-head">
                    <strong>Mawlynnong Community Sub-Center Dispensary</strong>
                    <span className="outlet-distance">0.8 km · Walking distance</span>
                  </div>
                  <p className="outlet-stock">
                    ✓ In Stock: Primary Field Kit, Blister Packs &amp; Antiseptic Supplies
                  </p>
                  <div className="outlet-actions">
                    <a href="tel:+919863000002" className="secondary-button">📞 Contact ANM</a>
                    <span className="price-tag">Free at Point of Care</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="cp-note">{PUSH_PRODUCTION_NOTE}</p>
        </section>
      )}
    </div>
  );
}

