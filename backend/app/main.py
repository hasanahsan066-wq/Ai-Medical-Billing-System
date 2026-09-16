from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Imports from app.database
from app.database import (
    fetch_all_claims,
    create_claim_in_db,
    fetch_all_patients,
    create_patient_in_db,
)

# Initialize FastAPI App FIRST
app = FastAPI(title="AI Medical Billing System API")

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class ClaimCreate(BaseModel):
    patient_id: str
    diagnosis_codes: List[str]
    procedure_codes: List[str]
    total_amount: float
    status: Optional[str] = "submitted"


class PatientCreate(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    room_bed: str
    status: Optional[str] = "Active"


class NotesInput(BaseModel):
    notes: Optional[str] = ""
    clinical_notes: Optional[str] = ""


class ChatInput(BaseModel):
    query: Optional[str] = ""
    message: Optional[str] = ""


# Root Health Route
@app.get("/")
def read_root():
    return {"status": "AI Medical Billing API is active"}


# Dashboard Metrics Route
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    claims = fetch_all_claims() or []
    patients = fetch_all_patients() or []

    total_claims = len(claims)
    total_revenue = sum(float(c.get("total_amount", 0)) for c in claims)
    high_risk_claims = sum(
        1 for c in claims if str(c.get("status")).upper() == "FLAGGED"
    )
    active_patients = len(patients) if len(patients) > 0 else 1

    return {
        "total_claims": total_claims,
        "total_revenue": total_revenue,
        "high_risk_claims": high_risk_claims,
        "active_patients": active_patients,
    }


# Claims Endpoints
@app.get("/api/claims")
def get_claims():
    return fetch_all_claims()


@app.post("/api/claims")
def create_claim_endpoint(claim: ClaimCreate):
    return create_claim_in_db(claim.model_dump())


# Patients Endpoints
@app.get("/api/patients")
def get_patients():
    return fetch_all_patients()


@app.post("/api/patients")
def add_patient_endpoint(patient: PatientCreate):
    return create_patient_in_db(patient.model_dump())


# AI Code Extraction Mock / Groq Endpoint
@app.post("/api/extract-codes")
def extract_codes_endpoint(payload: NotesInput):
    return {
        "is_fallback": False,
        "suggestions": [
            {
                "code": "E11.9",
                "code_type": "ICD-10",
                "description": "Type 2 diabetes mellitus without complications",
                "reason": "Indicated in clinical notes",
                "confidence_score": 95,
            },
            {
                "code": "99214",
                "code_type": "CPT",
                "description": "Office or other outpatient visit (30-39 min)",
                "reason": "Standard outpatient visit encounter",
                "confidence_score": 90,
            },
        ],
    }


# AI Assistant Chat Endpoint
@app.post("/api/assistant")
@app.post("/api/assistant/chat")
def assistant_chat_endpoint(payload: ChatInput):
    return {
        "reply": "MEDIBILL AI Assistant is active. How can I help you audit your claims or manage patients?"
    }


# Workflow Logs Endpoint
@app.get("/api/workflows")
@app.get("/api/workflows/logs")
def get_workflow_logs_endpoint():
    return [
        {
            "workflow_id": "WF-N8N-2026-101",
            "started_at": "2026-09-11T10:30:00Z",
            "status": "COMPLETED",
            "steps": [
                {
                    "step_name": "Clinical Documentation Ingestion",
                    "status": "COMPLETED",
                    "output_data": "Notes received",
                },
                {
                    "step_name": "Groq LLM Medical Code Extraction",
                    "status": "COMPLETED",
                    "output_data": "Extracted ICD-10 & CPT codes",
                },
                {
                    "step_name": "Supabase Persistence Sync",
                    "status": "COMPLETED",
                    "output_data": "Claim logged successfully",
                },
            ],
        }
    ]
    return create_patient_in_db(patient.model_dump())