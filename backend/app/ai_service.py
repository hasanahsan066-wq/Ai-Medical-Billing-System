import json
import logging
import os
from typing import List
from groq import Groq
from app.schemas import CodeSuggestion, ExtractCodesResponse

logger = logging.getLogger(__name__)

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

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


def extract_medical_codes(clinical_notes: str) -> ExtractCodesResponse:
    """Extracts structured medical code suggestions from clinical notes using Groq LLM with fallback safety net."""
    if not clinical_notes or not clinical_notes.strip():
        return ExtractCodesResponse(suggestions=[], is_fallback=False)

    if not client:
        logger.warning(
            "Groq API key not configured. Returning fallback mock code suggestions."
        )
        return ExtractCodesResponse(
            suggestions=[CodeSuggestion(**item) for item in FALLBACK_SUGGESTIONS],
            is_fallback=True,
        )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
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
        validated_suggestions: List[CodeSuggestion] = [
            CodeSuggestion(**item) for item in suggestions_raw
        ]

        return ExtractCodesResponse(
            suggestions=validated_suggestions, is_fallback=False
        )

    except Exception as exc:
        logger.error(
            f"Error during AI medical code extraction: {str(exc)}. Triggering fallback."
        )
        return ExtractCodesResponse(
            suggestions=[CodeSuggestion(**item) for item in FALLBACK_SUGGESTIONS],
            is_fallback=True,
        )