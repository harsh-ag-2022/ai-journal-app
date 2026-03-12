import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="AI Journal App API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
if not supabase_url or not supabase_key:
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment variables.")

# Supabase client dependency
def get_supabase() -> Client:
    try:
        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Database credentials are not configured properly.")
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gemini client setup
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    gemini_client = genai.Client(api_key=gemini_api_key)
else:
    gemini_client = None
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

# Models
class JournalEntryCreate(BaseModel):
    userId: str
    ambience: str
    text: str
    emotion: Optional[str] = None
    keywords: Optional[List[str]] = None
    summary: Optional[str] = None

class AnalyzeRequest(BaseModel):
    text: str

class AnalyzeResponse(BaseModel):
    emotion: str
    keywords: List[str]
    summary: str

@app.get("/")
def read_root():
    return {"message": "AI Journal API is running"}

@app.post("/api/journal")
def create_journal_entry(entry: JournalEntryCreate, supabase: Client = Depends(get_supabase)):
    # Create the base entry object with emotion analysis fields
    data = {
        "userId": entry.userId,
        "ambience": entry.ambience,
        "text": entry.text,
        "emotion": entry.emotion,
        "keywords": entry.keywords,
        "summary": entry.summary
    }
    
    response = supabase.table("journal_entries").insert(data).execute()
    return response.data

@app.get("/api/journal/{userId}")
def get_user_entries(userId: str, supabase: Client = Depends(get_supabase)):
    response = supabase.table("journal_entries").select("*").eq("userId", userId).execute()
    return response.data

@app.delete("/api/journal/entries/{entry_id}")
def delete_journal_entry(entry_id: str, supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("journal_entries").delete().eq("id", entry_id).execute()
        return {"message": "Entry deleted successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")

@app.post("/api/journal/analyze", response_model=AnalyzeResponse)
def analyze_journal(request: AnalyzeRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API is not configured.")
    
    prompt = f"""
    Analyze the following journal entry. 
    Provide an overall emotion, a list of up to 5 keywords, and a short summary (1-2 sentences).
    
    Journal Entry:
    {request.text}
    """
    
    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnalyzeResponse,
            ),
        )
        
        import json
        result = json.loads(response.text)
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/journal/insights/{userId}")
def get_insights(userId: str, supabase: Client = Depends(get_supabase)):
    response = supabase.table("journal_entries").select("*").eq("userId", userId).execute()
    entries = response.data
    
    if not entries:
         return {
             "totalEntries": 0,
             "topEmotion": None,
             "mostUsedAmbience": None,
             "recentKeywords": []
         }
         
    total_entries = len(entries)
    
    # Calculate top emotion
    emotions = [e.get("emotion") for e in entries if e.get("emotion")]
    top_emotion = max(set(emotions), key=emotions.count) if emotions else None
    
    # Calculate most used ambience
    ambiences = [e.get("ambience") for e in entries if e.get("ambience")]
    most_used_ambience = max(set(ambiences), key=ambiences.count) if ambiences else None
    
    # Collect recent keywords (from the last 5 entries, assuming list might be chronologically ordered or we just take the last 5)
    # We should sort by id or created_at if it exists, but we'll just reverse the array
    recent_entries = list(reversed(entries))[:5]
    recent_keywords = []
    for entry in recent_entries:
        if entry.get("keywords"):
            recent_keywords.extend(entry.get("keywords"))
            
    # Deduplicate keeping order or just a unique set of recent keywords
    # Just return up to 10 unique keywords
    unique_recent_keywords = list(dict.fromkeys(recent_keywords))[:10]
    
    return {
        "totalEntries": total_entries,
        "topEmotion": top_emotion,
        "mostUsedAmbience": most_used_ambience,
        "recentKeywords": unique_recent_keywords
    }
