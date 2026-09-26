export type MedicineForm = "tablet" | "capsule" | "syrup" | "drops" | "ointment" | "injection";
export type FoodRelation = "before_food" | "after_food" | "with_food" | "empty_stomach";

export interface ScheduledMedicine {
  id: string;
  name: string;
  strength: string;
  form: MedicineForm;
  dose: string;
  foodRelation: FoodRelation;
  slots: {
    morning?: boolean; // e.g. 08:00 AM
    afternoon?: boolean; // e.g. 01:00 PM
    evening?: boolean; // e.g. 06:00 PM
    night?: boolean; // e.g. 09:00 PM
  };
  customTimes: string[]; // e.g. ["08:00", "20:00"]
  durationDays: number;
  startDate: string;
  instructions?: string;
}

export interface AdherenceLog {
  id: string;
  prescriptionId: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string; // e.g. "2026-09-27T08:00:00"
  status: "taken" | "skipped" | "snoozed";
  loggedAt: string;
}

export interface PatientPrescription {
  id: string;
  patientRef: string;
  doctorName: string;
  diagnosis?: string;
  prescriptionImageUrl?: string;
  medicines: ScheduledMedicine[];
  adherenceLogs: AdherenceLog[];
  createdAt: string;
  updatedAt?: string;
  synced: boolean;
}
