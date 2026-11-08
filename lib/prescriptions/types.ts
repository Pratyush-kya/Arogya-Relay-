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
    name: "Dr. Bishnu Prasad Satapathy, MBBS",
    nmcNumber: "OMC-2018-88412",
    specialization: "General Medicine & Cardiology",
    hospital: "Capital Hospital Bhubaneswar / DHH Khurda",
    experience: "12 Years Experience",
    avatar: "👨‍⚕️",
    email: "bishnuprasadsatapathy7846@gmail.com",
  },
  {
    id: "doc-ananya",
    name: "Dr. Samarpit Biswal, MD",
    nmcNumber: "OMC-2020-54190",
    specialization: "Internal Medicine & Paediatrics",
    hospital: "AIIMS Bhubaneswar (Apex Trauma Centre)",
    experience: "8 Years Experience",
    avatar: "👨‍⚕️",
    email: "samarpitbiswal966@gmail.com",
  },
  {
    id: "doc-mishra",
    name: "Dr. Ananya Mishra, MBBS, MD",
    nmcNumber: "OMC-2019-72415",
    specialization: "Obstetrics, Gynaecology & Community Health",
    hospital: "SCB Medical College & Hospital, Cuttack",
    experience: "10 Years Experience",
    avatar: "👩‍⚕️",
    email: "dr.ananya.mishra@odisha-health.org",
  },
];

export const THREE_AVAILABLE_DOCTORS = TWO_AVAILABLE_DOCTORS;
export const AVAILABLE_DOCTORS = TWO_AVAILABLE_DOCTORS;

export function getAvailableDoctors(): AvailableDoctor[] {
  if (typeof window === "undefined") return TWO_AVAILABLE_DOCTORS;
  try {
    const list = [...TWO_AVAILABLE_DOCTORS];
    const rawProfile = localStorage.getItem("arogya.local_profile");
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      if (p && p.role === "doctor" && (p.display_name || p.full_name)) {
        const docName = p.display_name || p.full_name;
        const cleanEmail = (p.email || "").toLowerCase().trim();
        const existingIdx = list.findIndex(
          (d) =>
            (cleanEmail && d.email.toLowerCase() === cleanEmail) ||
            d.name.toLowerCase() === docName.toLowerCase()
        );
        const dynamicDoc: AvailableDoctor = {
          id: p.id || (existingIdx >= 0 ? list[existingIdx].id : `doc-${Date.now()}`),
          name: docName,
          nmcNumber: p.medical_reg_no || p.nmc_registration_number || (cleanEmail.includes("samarpit") ? "OMC-2020-54190" : "OMC-2018-88412"),
          specialization: p.specialization || (cleanEmail.includes("samarpit") ? "Internal Medicine & Paediatrics" : "General Medicine & Cardiology"),
          hospital: p.facility_name || p.hospital_affiliation || (cleanEmail.includes("samarpit") ? "AIIMS Bhubaneswar (Apex Trauma Centre)" : "Capital Hospital Bhubaneswar / DHH Khurda"),
          experience: "Verified Medical Officer",
          avatar: "👨‍⚕️",
          email: p.email || (cleanEmail.includes("samarpit") ? "samarpitbiswal966@gmail.com" : "bishnuprasadsatapathy7846@gmail.com"),
        };
        if (existingIdx >= 0) {
          list[existingIdx] = dynamicDoc;
        } else {
          list.unshift(dynamicDoc);
        }
      }
    }
    return list;
  } catch {
    return TWO_AVAILABLE_DOCTORS;
  }
}

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
    id: "ph-cuttack-scb",
    name: "PMBJP Jan Aushadhi Kendra — SCB Medical College",
    address: "SCB Medical College & Hospital Campus, Mangalabag, Cuttack - 753007",
    phone: "1800-180-8080 (National Jan Aushadhi Toll-Free)",
    email: "pmbjp.scbcuttack@gov.in",
    distanceKm: 1.1,
  },
  {
    id: "ph-bbsr-capital",
    name: "PMBJP Jan Aushadhi Kendra — Capital Hospital",
    address: "Capital Hospital Campus, Unit-6, Bhubaneswar - 751001",
    phone: "1800-180-8080 (National Jan Aushadhi Toll-Free)",
    email: "pmbjp.capitalhospital@gov.in",
    distanceKm: 1.8,
  },
  {
    id: "ph-bbsr-aiims",
    name: "AMRIT & Jan Aushadhi Pharmacy — AIIMS Bhubaneswar",
    address: "AIIMS Apex Trauma Ground Floor, Sijua, Patrapada - 751019",
    phone: "1800-180-8080 (National Jan Aushadhi Toll-Free)",
    email: "amrit.aiimsbhubaneswar@gov.in",
    distanceKm: 2.5,
  },
  {
    id: "ph-khurda-dhh",
    name: "Red Cross Jan Aushadhi Kendra — DHH Khurda",
    address: "District Headquarters Hospital Campus, Khurda Town - 752055",
    phone: "1800-180-8080 (National Jan Aushadhi Toll-Free)",
    email: "jan.aushadhi.khurda@gov.in",
    distanceKm: 3.2,
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
