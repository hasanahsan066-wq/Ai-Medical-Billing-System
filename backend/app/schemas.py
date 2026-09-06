from pydantic import BaseModel
from typing import Optional, List

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    dob: str
    insurance_id: Optional[str] = None

class ClaimCreate(BaseModel):
    patient_id: str
    diagnosis_codes: List[str]
    procedure_codes: List[str]
    total_amount: float
    status: Optional[str] = "draft"

class MedicalNotesInput(BaseModel):
    clinical_notes: str
from typing import Literal
from pydantic import BaseModel, Field


class ClinicalNotesRequest(BaseModel):
    clinical_notes: str = Field(
        ..., min_length=1, description="Raw clinical/doctor notes text"
    )


class CodeSuggestion(BaseModel):
    code: str = Field(..., description="Standardized code, e.g., R07.9 or 93000")
    code_type: Literal["ICD-10", "CPT"] = Field(
        ..., description="Type of code: ICD-10 or CPT"
    )
    description: str = Field(..., description="Official medical name/description")
    reason: str = Field(..., description="Clinical justification for suggestion")
    confidence_score: int = Field(
        ..., ge=0, le=100, description="Confidence percentage integer (0-100)"
    )


class ExtractCodesResponse(BaseModel):
    suggestions: list[CodeSuggestion]
    is_fallback: bool = Field(
        default=False, description="Flag indicating if fallback mock data was used"
    )