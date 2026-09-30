/**
 * Arogya Zero-Loss Two-Stage Escrow & Monetization Engine
 *
 * Prevents platform loss from payment gateway refund charges.
 * Guarantees fair compensation to frontline clinicians while providing
 * patients transparent pricing and nearest Jan Aushadhi generic savings.
 */

export interface EscrowTransaction {
  id: string;
  caseId: string;
  patientRef: string;
  doctorId: string;
  doctorFeeInr: number;
  platformConvenienceFeeInr: number; // ₹10 to ₹15 (covers gateway ~2% + GST + cloud costs)
  medicineEstimateInr: number;
  totalPaidByPatientInr: number;
  status: "held_in_escrow" | "doctor_settled" | "dispensed_completed" | "refunded";
  idempotencyKey: string;
  createdAt: string;
  settledAt?: string;
  dispensedAt?: string;
  chemistId?: string;
}

const LOCAL_ESCROW_KEY = "arogya.escrow.transactions";
let MEMORY_ESCROWS: EscrowTransaction[] = [];

export function getLocalEscrows(): EscrowTransaction[] {
  if (typeof window === "undefined") return MEMORY_ESCROWS;
  try {
    const raw = localStorage.getItem(LOCAL_ESCROW_KEY);
    return raw ? JSON.parse(raw) : MEMORY_ESCROWS;
  } catch {
    return MEMORY_ESCROWS;
  }
}

export function saveLocalEscrow(tx: EscrowTransaction) {
  const list = getLocalEscrows();
  const next = [tx, ...list.filter((item) => item.id !== tx.id)];
  MEMORY_ESCROWS = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_ESCROW_KEY, JSON.stringify(next));
    } catch {
      // Storage fallback
    }
  }
}

/**
 * Initialize a transparent zero-loss consultation escrow
 */
export function createConsultationEscrow(params: {
  caseId: string;
  patientRef: string;
  doctorId: string;
  doctorFeeInr: number;
  medicineEstimateInr?: number;
}): EscrowTransaction {
  const doctorFee = Math.max(30, Math.min(250, params.doctorFeeInr));
  const platformFee = 10; // Fixed nominal platform maintenance & payment processing buffer
  const medicineEstimate = params.medicineEstimateInr ?? 0;
  const total = doctorFee + platformFee + medicineEstimate;

  const tx: EscrowTransaction = {
    id: `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
    caseId: params.caseId,
    patientRef: params.patientRef,
    doctorId: params.doctorId,
    doctorFeeInr: doctorFee,
    platformConvenienceFeeInr: platformFee,
    medicineEstimateInr: medicineEstimate,
    totalPaidByPatientInr: total,
    status: "held_in_escrow",
    idempotencyKey: `idem-${params.caseId}-${params.doctorId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  saveLocalEscrow(tx);
  return tx;
}

/**
 * Release Doctor Consultation Fee upon digital prescription sign-off
 */
export function settleDoctorEscrow(caseId: string): EscrowTransaction | null {
  const list = getLocalEscrows();
  const tx = list.find((t) => t.caseId === caseId);
  if (!tx) return null;

  if (tx.status === "held_in_escrow") {
    tx.status = "doctor_settled";
    tx.settledAt = new Date().toISOString();
    saveLocalEscrow(tx);
  }
  return tx;
}

/**
 * Complete Chemist Dispensation Settlement and permanently lock transaction
 */
export function settleChemistEscrow(
  caseId: string,
  chemistId: string
): { success: boolean; tx: EscrowTransaction | null; message: string } {
  const list = getLocalEscrows();
  const tx = list.find((t) => t.caseId === caseId);

  if (!tx) {
    return { success: false, tx: null, message: "Transaction record not found." };
  }

  if (tx.status === "dispensed_completed") {
    return {
      success: false,
      tx,
      message: "Security warning: Medicine has already been dispensed and settled for this order.",
    };
  }

  tx.status = "dispensed_completed";
  tx.chemistId = chemistId;
  tx.dispensedAt = new Date().toISOString();
  saveLocalEscrow(tx);

  return {
    success: true,
    tx,
    message: `Dispensation successfully verified. Settled at pharmacy ${chemistId}.`,
  };
}
