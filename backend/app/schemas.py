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


class ClaimValidationResponse(BaseModel):
    status: Literal["PASS", "WARNING", "REVIEW_REQUIRED"]
    risk_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Risk level percentage (0=Safe, 100=High Risk)",
    )
    issues: list[str] = Field(
        default_factory=list, description="Detected billing or clinical issues"
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Actionable suggestions for billing staff",
    )