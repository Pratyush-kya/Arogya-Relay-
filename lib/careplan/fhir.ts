import type { MedicationOrder } from "./types.ts";

export const PUSH_PRODUCTION_NOTE =
  "Reminders and notifications operate locally and via browser Web Push. Notification delivery is subject to device battery optimization, platform permissions, and HTTPS.";

export function toFhirMedicationRequest(order: MedicationOrder) {
  return {
    resourceType: "MedicationRequest",
    id: order.id,
    status: order.status,
    intent: "order",
    medicationCodeableConcept: {
      text: `${order.medicine} ${order.strength}`,
    },
    subject: {
      reference: `Patient/${order.patientId}`,
    },
    authoredOn: order.signedAt || order.startDate,
    requester: order.signedByDoctorId ? { reference: `Practitioner/${order.signedByDoctorId}` } : undefined,
    dosageInstruction: [
      {
        text: `${order.dose} ${order.route} - ${order.instructions}`,
      },
    ],
  };
}

export function toICS(
  events: Array<{ title: string; start: string }>,
  _opts?: { genericTitles?: boolean }
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arogya Relay//Care Plan//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const ev of events) {
    const dt = ev.start.replace(/[-:]/g, "").slice(0, 15) + "Z";
    lines.push(
      "BEGIN:VEVENT",
      `SUMMARY:${ev.title}`,
      `DTSTART:${dt}`,
      `DTEND:${dt}`,
      "DESCRIPTION:Prescribed care task or medicine reminder",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
