from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.ai_service import extract_medical_codes
from app.schemas import ClinicalNotesRequest, ExtractCodesResponse

app = FastAPI(title="AI Medical Billing System API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClaimCreateRequest(BaseModel):
    patient_id: str = Field(..., min_length=1)
    diagnosis_codes: list[str] = Field(default_factory=list)
    procedure_codes: list[str] = Field(default_factory=list)
    total_amount: float = Field(..., gt=0)
    status: Optional[str] = "submitted"


# In-memory storage for submitted claims
claims_db = []


@app.post("/api/extract-codes", response_model=ExtractCodesResponse)
def handle_extract_codes(payload: ClinicalNotesRequest):
    return extract_medical_codes(payload.clinical_notes)


@app.get("/api/claims")
def get_claims():
    return claims_db


@app.post("/api/claims", status_code=status.HTTP_201_CREATED)
def create_claim(claim: ClaimCreateRequest):
    # Rule 1: At least one diagnosis code is required
    if not claim.diagnosis_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Validation Error: Claim must include at least one approved ICD-10 diagnosis code.",
        )

    # Rule 2: Duplicate Claim Detection
    for existing in claims_db:
        if (
            existing["patient_id"] == claim.patient_id
            and sorted(existing["diagnosis_codes"])
            == sorted(claim.diagnosis_codes)
            and sorted(existing["procedure_codes"])
            == sorted(claim.procedure_codes)
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate Claim Warning: An identical claim for Patient {claim.patient_id} has already been submitted.",
            )

    new_claim = {
        "id": f"CLM-{len(claims_db) + 1001}",
        "patient_id": claim.patient_id,
        "diagnosis_codes": claim.diagnosis_codes,
        "procedure_codes": claim.procedure_codes,
        "total_amount": claim.total_amount,
        "status": claim.status,
    }

    claims_db.append(new_claim)
    return {
        "message": "Claim generated and submitted successfully!",
        "claim": new_claim,
    }