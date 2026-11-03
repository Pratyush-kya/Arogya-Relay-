export interface AvailableDoctor {
  id: string;
  name: string;
  nmcNumber: string;
  specialization: string;
  hospital: string;
  experience: string;
  avatar: string;
  email: string; // Attached Gmail for direct communication without AI
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
    email: "bishnuprasadsatapathy7846@gmail.com",
  },
  {
    id: "doc-ananya",
    name: "Dr. Ananya Sharma, MD",
    nmcNumber: "NMC-2020-54190",
    specialization: "Internal Medicine & Paediatrics",
    hospital: "Community Health Centre & Rural Hospital",
    experience: "8 Years Experience",
    avatar: "👩‍⚕️",
    email: "samarpitbiswal966@gmail.com",
  },
];

export function getDoctorGmailComposeUrl(
  doctorEmail: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: doctorEmail,
    su: subject,
    body: body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

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

export interface AvailableChemist {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  distanceKm: number;
}

export const NEARBY_CHEMISTS: AvailableChemist[] = [
  {
    id: "ph-01",
    name: "Pradhan Mantri Jan Aushadhi Kendra #7402",
    address: "Main Market Road, near Block Office",
    phone: "+91 94370 12345",
    email: "pratyushrath50@gmail.com",
    distanceKm: 1.2,
  },
  {
    id: "ph-02",
    name: "Community Red Cross Generic Dispensary",
    address: "Hospital Road, Civil Lines",
    phone: "+91 94371 67890",
    email: "redcross.dispensary@health.org",
    distanceKm: 2.4,
  },
  {
    id: "ph-03",
    name: "Jan Aushadhi Kendra #1084",
    address: "Sub-Divisional Hospital Complex",
    phone: "+91 98610 54321",
    email: "jan.aushadhi.kendra@pharma.org",
    distanceKm: 3.1,
  },
];

export function getChemistGmailComposeUrl(
  chemistEmail: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: chemistEmail,
    su: subject,
    body: body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export type FulfillmentMode = "store_pickup" | "home_delivery";
export type FulfillmentStatus =
  | "awaiting_patient_choice"
  | "order_confirmed"
  | "packed_ready"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "dispensed";

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
  suggestedChemist?: AvailableChemist;
  fulfillmentMode?: FulfillmentMode;
  fulfillmentStatus?: FulfillmentStatus;
  deliveryAddress?: string;
  deliveryFeeInr?: number;
  finalTotalInr?: number;
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
  doctorEmail?: string;
  handledByAi?: boolean;
  issueType: FollowUpIssueType;
  patientMessage: string;
  reportedAt: string;
  status: "pending_doctor_review" | "doctor_revised" | "dispensed";
  doctorReply?: string;
  revisedMedicines?: ScheduledMedicine[];
  suggestedChemist?: AvailableChemist;
  fulfillmentMode?: FulfillmentMode;
  fulfillmentStatus?: FulfillmentStatus;
  deliveryAddress?: string;
  deliveryFeeInr?: number;
  finalTotalInr?: number;
  orderConfirmedAt?: string;
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
