import type { MedicationOrder, CareItem, TaperStep } from "./types.ts";

export const DEFAULT_MISSED_DOSE_ADVICE =
  "Take the missed dose as soon as you remember. If it is almost time for your next dose, skip the missed dose and resume your normal schedule. Do not take two doses at the same time.";

export interface ReminderInstance {
  id: string;
  sourceType: "medication" | "task";
  sourceId: string;
  dueAt: string;
  state: "upcoming" | "due" | "missed" | "completed";
}

export function activeTaperStep(order: MedicationOrder, dateStr: string): TaperStep | null {
  if (!order.tapers || order.tapers.length === 0) return null;
  for (const step of order.tapers) {
    if (dateStr >= step.fromDate && dateStr <= step.toDate) {
      return step;
    }
  }
  return null;
}

export function missedDoseAdviceFor(order: MedicationOrder): string {
  return order.missedDoseAdvice || DEFAULT_MISSED_DOSE_ADVICE;
}

export function medicationDueTimes(
  order: MedicationOrder,
  windowStart: string,
  _windowEnd?: string
): string[] {
  if (order.frequency.kind === "ambiguous" || order.frequency.kind === "prn") return [];
  const dateStr = windowStart.slice(0, 10);
  if (dateStr < order.startDate || dateStr > order.endDate) return [];

  const times: string[] = [];
  if (order.frequency.kind === "times_per_day") {
    const count = order.frequency.times || 1;
    if (count === 1) times.push("09:00:00");
    else if (count === 2) times.push("09:00:00", "21:00:00");
    else if (count === 3) times.push("09:00:00", "15:00:00", "21:00:00");
    else if (count >= 4) times.push("06:00:00", "12:00:00", "18:00:00", "22:00:00");
  } else if (order.frequency.kind === "every_hours") {
    const h = order.frequency.hours || 8;
    for (let hr = 8; hr < 24; hr += h) {
      times.push(`${String(hr).padStart(2, "0")}:00:00`);
    }
  } else {
    times.push("09:00:00");
  }

  return times.map((t) => `${dateStr}T${t}`);
}

export function resolveConflict(times: string[], minSeparationMinutes = 30): string[] {
  if (times.length <= 1) return times;
  const sorted = [...times].sort();
  const result: string[] = [];
  let lastTimeMs = -Infinity;

  for (const t of sorted) {
    let tMs = new Date(t).getTime();
    if (tMs - lastTimeMs < minSeparationMinutes * 60000) {
      tMs = lastTimeMs + minSeparationMinutes * 60000;
    }
    result.push(new Date(tMs).toISOString().slice(0, 19));
    lastTimeMs = tMs;
  }
  return result;
}

export function buildReminders({
  orders,
  items,
  windowStart,
  windowEnd,
  now,
}: {
  orders: MedicationOrder[];
  items?: CareItem[];
  windowStart: string;
  windowEnd: string;
  now: string;
}): ReminderInstance[] {
  const reminders: ReminderInstance[] = [];
  const dateStr = windowStart.slice(0, 10);

  for (const order of orders) {
    if (order.status !== "active") continue;
    if (order.frequency.kind === "ambiguous" || order.frequency.kind === "prn") continue;
    if (dateStr < order.startDate || dateStr > order.endDate) continue;

    const times: string[] = [];
    if (order.frequency.kind === "times_per_day") {
      const count = order.frequency.times || 1;
      if (count === 1) times.push("09:00:00");
      else if (count === 2) times.push("09:00:00", "21:00:00");
      else if (count === 3) times.push("08:00:00", "14:00:00", "20:00:00");
      else if (count >= 4) times.push("06:00:00", "12:00:00", "18:00:00", "22:00:00");
    } else if (order.frequency.kind === "every_hours") {
      const h = order.frequency.hours || 8;
      for (let hr = 8; hr < 24; hr += h) {
        times.push(`${String(hr).padStart(2, "0")}:00:00`);
      }
    } else {
      times.push("09:00:00");
    }

    for (let i = 0; i < times.length; i++) {
      const dueAt = `${dateStr}T${times[i]}`;
      const diffMin = (new Date(dueAt).getTime() - new Date(now).getTime()) / 60000;
      let state: ReminderInstance["state"] = "upcoming";
      if (diffMin < -120) state = "missed";
      else if (diffMin <= 30 && diffMin >= -120) state = "due";

      reminders.push({
        id: `rem-${order.id}-${dateStr}-${i}`,
        sourceType: "medication",
        sourceId: order.id,
        dueAt,
        state,
      });
    }
  }

  if (items) {
    for (const item of items) {
      if (item.scheduledDate === dateStr) {
        reminders.push({
          id: `task-${item.id}`,
          sourceType: "task",
          sourceId: item.id,
          dueAt: `${dateStr}T10:00:00`,
          state: "upcoming",
        });
      }
    }
  }

  return reminders.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
