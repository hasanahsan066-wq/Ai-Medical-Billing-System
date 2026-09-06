export interface Patient {
  id?: string;
  first_name: string;
  last_name: string;
  dob: string;
  insurance_id?: string;
}

export interface Claim {
  id?: string;
  patient_id: string;
  diagnosis_codes: string[];
  procedure_codes: string[];
  total_amount: number;
  status?: string;
}

export interface CodeSuggestion {
  code: string;
  code_type: 'ICD-10' | 'CPT';
  description: string;
  reason: string;
  confidence_score: number;
}

export interface ExtractCodesResponse {
  suggestions: CodeSuggestion[];
  is_fallback: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetches the list of all registered patients.
 */
export async function getPatients() {
  const res = await fetch(`${API_BASE_URL}/api/patients`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

/**
 * Creates a new patient record.
 */
export async function createPatient(data: Omit<Patient, 'id'>) {
  const res = await fetch(`${API_BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create patient');
  return res.json();
}

/**
 * Fetches the list of submitted claims.
 */
export async function getClaims() {
  const res = await fetch(`${API_BASE_URL}/api/claims`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch claims');
  return res.json();
}

/**
 * Creates a new claim with Day 8 validation checks.
 */
export async function createClaim(data: Omit<Claim, 'id'>) {
  const res = await fetch(`${API_BASE_URL}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.detail || 'Failed to create claim');
  }

  return responseData;
}

/**
 * Sends clinical notes to the FastAPI backend to receive AI-suggested medical codes.
 */
export async function extractCodes(clinicalNotes: string): Promise<ExtractCodesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/extract-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clinical_notes: clinicalNotes }),
  });

  if (!response.ok) {
    throw new Error(`Extraction request failed with status: ${response.status}`);
  }

  const data: ExtractCodesResponse = await response.json();
  return data;
}