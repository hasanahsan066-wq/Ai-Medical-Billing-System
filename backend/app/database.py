import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be configured in .env")

supabase: Client = create_client(url, key)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase

app = FastAPI(
    title="AI Medical Billing API",
    description="Backend API for AI Medical Billing MVP",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Medical Billing Backend",
        "version": "0.1.0"
    }

@app.get("/api/patients")
def get_patients():
    response = supabase.table("patients").select("*").execute()
    return {"patients": response.data}