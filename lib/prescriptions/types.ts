export interface AvailableDoctor {
  id: string;
  name: string;
  nmcNumber: string;
  specialization: string;
  hospital: string;
  experience: string;
  avatar: string;
}

export const TWO_AVAILABLE_DOCTORS: AvailableDoctor[] = [
  {
    id: "doc-rajesh",
    name: "Dr. Rajesh Patel, MBBS",
    nmcNumber: "NMC-2018-88412",
    specialization: "General Medicine & Cardiology",
    hospital: "Mawlynnong Sub-Divisional Hospital & PHC",
    experience: "12 Years Experience",
    avatar: "👨‍⚕️",
  },
  {
    id: "doc-ananya",
    name: "Dr. Ananya Sharma, MD",
    nmcNumber: "NMC-2020-54190",
    specialization: "Internal Medicine & Paediatrics",
    hospital: "Community Health Centre & Rural Hospital",
    experience: "8 Years Experience",
    avatar: "👩‍⚕️",
  },
];

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
  totalPriceInr?: number;
  mrpPriceInr?: number;
  suggestedChemist?: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    distanceKm?: number;
  };
}

export type FollowUpIssueType =
  | "dose_change"
  | "side_effect"
  | "symptom_worsened"
  | "feeling_better"
  | "medicine_finished"
  | "other";

export interface PrescriptionFollowUpRequest {
  id: string;
  prescriptionId: string;
  patientRef: string;
  patientName: string;
  doctorName: string;
  doctorNmc?: string;
  issueType: FollowUpIssueType;
  patientMessage: string;
  reportedAt: string;
  status: "pending_doctor_review" | "doctor_revised" | "dispensed";
  doctorReply?: string;
  revisedMedicines?: ScheduledMedicine[];
  suggestedChemist?: {
    id: string;
    name: string;
    address: string;
    phone?: string;
    distanceKm?: number;
  };
  totalPriceInr?: number;
  mrpPriceInr?: number;
  savingsPercent?: number;
  batchVerified?: boolean;
  expirySafeDate?: string;
  dispensedChemistId?: string;
  dispensedChemistName?: string;
  dispensedAt?: string;
  doctorAuditStatus?: "pending_dispense" | "dispense_verified" | "discrepancy_flagged";
  doctorAuditNotes?: string;
}
