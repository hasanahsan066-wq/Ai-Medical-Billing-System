import json
import logging
import os
from dotenv import find_dotenv, load_dotenv
from groq import Groq
from app.schemas import CodeSuggestion, ExtractCodesResponse

# Automatically locate and load .env file from any parent folder
load_dotenv(find_dotenv())

logger = logging.getLogger(__name__)

FALLBACK_SUGGESTIONS = [
    {
        "code": "R07.9",
        "code_type": "ICD-10",
        "description": "Chest pain, unspecified",
        "reason": "Patient presented with acute sub-sternal chest discomfort during examination.",
        "confidence_score": 92,
    },
    {
        "code": "93000",
        "code_type": "CPT",
        "description": "Electrocardiogram, routine ECG with at least 12 leads",
        "reason": "12-lead ECG performed in room to evaluate acute chest pain symptoms.",
        "confidence_score": 96,
    },
    {
        "code": "I10",
        "code_type": "ICD-10",
        "description": "Essential (primary) hypertension",
        "reason": "Elevated blood pressure readings (145/92 mmHg) recorded in vitals log.",
        "confidence_score": 78,
    },
]

SYSTEM_PROMPT = """
You are an expert AI Medical Coding Assistant specializing in clinical documentation review, ICD-10 diagnosis codes, and CPT procedure codes.

Analyze the provided clinical notes and extract standardized diagnosis and procedure codes.

You MUST respond with a valid JSON object strictly matching this schema:
{
  "suggestions": [
    {
      "code": "Standardized code (e.g., 'R07.9' or '93000')",
      "code_type": "ICD-10" or "CPT",
      "description": "Official code description",
      "reason": "Concise clinical justification extracted from notes",
      "confidence_score": integer between 0 and 100
    }
  ]
}

Rules:
1. Extract only clinically supported ICD-10 and CPT codes.
2. 'code_type' must strictly be either "ICD-10" or "CPT".
3. Provide realistic confidence scores reflective of how explicit the documentation is.
4. Output valid, raw JSON only. Do not wrap in markdown or add conversational text.
"""


def get_groq_client():
    """Retrieves an active Groq client instance dynamically."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key:
        return Groq(api_key=api_key)
    return None


def extract_medical_codes(clinical_notes: str) -> ExtractCodesResponse:
    """Extracts structured medical code suggestions from clinical notes using Groq LLMs with multi-model fallback."""
    if not clinical_notes or not clinical_notes.strip():
        return ExtractCodesResponse(suggestions=[], is_fallback=False)

    client = get_groq_client()
    if not client:
        logger.warning(
            "Groq API key not configured or empty. Returning fallback mock code suggestions."
        )
        return ExtractCodesResponse(
            suggestions=[CodeSuggestion(**item) for item in FALLBACK_SUGGESTIONS],
            is_fallback=True,
        )

    # Models list to attempt in sequence
    candidate_models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "llama3-8b-8192",
    ]

    for model_name in candidate_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT.strip()},
                    {"role": "user", "content": f"Clinical Notes:\n{clinical_notes}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)

            suggestions_raw = parsed.get("suggestions", [])
            validated_suggestions: list[CodeSuggestion] = [
                CodeSuggestion(**item) for item in suggestions_raw
            ]

            return ExtractCodesResponse(
                suggestions=validated_suggestions, is_fallback=False
            )

        except Exception as exc:
            logger.warning(
                f"Model '{model_name}' failed with error: {str(exc)}. Retrying with secondary candidate..."
            )

    logger.error("All candidate Groq models failed. Triggering fallback data.")
    return ExtractCodesResponse(
        suggestions=[CodeSuggestion(**item) for item in FALLBACK_SUGGESTIONS],
        is_fallback=True,
    )


def validate_claim_with_ai(
    patient_id: str,
    diagnosis_codes: list[str],
    procedure_codes: list[str],
    total_amount: float,
) -> dict:
    """Audits a generated medical claim for coding inconsistencies and compliance risks."""
    issues = []
    recommendations = []
    risk_score = 10

    if not diagnosis_codes:
        issues.append("Missing primary diagnosis code (ICD-10).")
        recommendations.append(
            "Attach at least one approved diagnosis code before clearing."
        )
        risk_score += 50

    if not procedure_codes:
        issues.append("Procedure codes (CPT) missing for billed amount.")
        recommendations.append(
            "Verify if a procedure/consultation CPT code should be added."
        )
        risk_score += 30

    if total_amount > 10000 and len(procedure_codes) <= 1:
        issues.append("High claim amount detected with minimal procedure codes.")
        recommendations.append(
            "Perform manual chart review to justify billed charges."
        )
        risk_score += 20

    status_flag = "PASS"
    if risk_score >= 60:
        status_flag = "REVIEW_REQUIRED"
    elif risk_score >= 30:
        status_flag = "WARNING"

    return {
        "status": status_flag,
        "risk_score": min(risk_score, 100),
        "issues": (
            issues
            if issues
            else ["No compliance or coding discrepancies detected."]
        ),
        "recommendations": (
            recommendations
            if recommendations
            else ["Claim is clear for submission."]
        ),
    }