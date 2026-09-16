import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase Database")
    except Exception as e:
        print(f"⚠️ Supabase connection error: {e}")


# 1. Fetch all claims
def fetch_all_claims():
    if supabase:
        try:
            res = (
                supabase.table("claims")
                .select("*")
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as err:
            print(f"Fetch Claims Error: {err}")
    return []


# 2. Create a claim
def create_claim_in_db(claim_data: dict):
    if supabase:
        try:
            res = supabase.table("claims").insert(claim_data).execute()
            return {
                "message": "Claim generated and saved to Supabase successfully!",
                "claim": res.data[0] if res.data else claim_data,
            }
        except Exception as err:
            print(f"Create Claim Error: {err}")
            return {"message": f"Error: {str(err)}", "claim": None}

    return {
        "message": "Claim generated locally (Database Offline)",
        "claim": {
            "validation": {
                "status": "PASS",
                "risk_score": 5,
                "issues": [],
                "recommendations": [],
            }
        },
    }


# 3. Fetch all patients
def fetch_all_patients():
    if supabase:
        try:
            res = (
                supabase.table("patients")
                .select("*")
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as err:
            print(f"Fetch Patients Error: {err}")
    return []


# 4. Create a patient
def create_patient_in_db(patient_data: dict):
    if supabase:
        try:
            res = supabase.table("patients").insert(patient_data).execute()
            return res.data[0] if res.data else patient_data
        except Exception as err:
            print(f"Create Patient Error: {err}")
    return patient_data