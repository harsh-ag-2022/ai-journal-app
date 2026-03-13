import os
import hashlib
import json
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="AI Journal App API")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Vercel frontend to contact Render backend
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

@app.post("/api/journal/analyze")
@limiter.limit("5/minute")
def analyze_journal(request: Request, body: AnalyzeRequest, supabase: Client = Depends(get_supabase)):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API is not configured.")
        
    text_hash = hashlib.sha256(body.text.encode('utf-8')).hexdigest()
    
    # Check cache first
    try:
        cache_response = supabase.table("analysis_cache").select("response_json").eq("text_hash", text_hash).execute()
        if cache_response.data and len(cache_response.data) > 0:
            cached_json = cache_response.data[0]["response_json"]
            async def cached_stream():
                yield f"data: {json.dumps(cached_json)}\n\n"
            return StreamingResponse(cached_stream(), media_type="text/event-stream")
    except Exception as e:
        print(f"Failed to read from cache: {e}")

    prompt = f"""
    Analyze the following journal entry. 
    1. Overall Emotion: Choose a single defining emotion.
    2. Keywords: Provide an array of up to 5 keywords. TRICLY RESTRICT THESE keywords to emotive shifts, emotional states, mental well-being, or deep psychological themes. DO NOT include random nouns, places, people, or plain descriptive verbs. (e.g. use "Grief", "Resilience", "Anxiety" instead of "Dog", "Work", "Running").
    3. Summary: Provide a short, insightful summary (1-2 sentences).
    
    Journal Entry:
    {body.text}
    """
    
    try:
        response_stream = gemini_client.models.generate_content_stream(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnalyzeResponse,
            ),
        )
        
        async def stream_generator():
            full_response = ""
            for chunk in response_stream:
                if chunk.text:
                    full_response += chunk.text
                    yield f"data: {chunk.text}\n\n"
            
            # Save to cache when done
            try:
                result = json.loads(full_response)
                supabase.table("analysis_cache").insert({
                    "text_hash": text_hash,
                    "response_json": result
                }).execute()
            except Exception as e:
                print(f"Failed to write to cache or parse json: {e}")
                
        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    except Exception as e:
        import traceback
        traceback.print_exc()
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
             "recentKeywords": [],
             "timeline": []
         }
         
    total_entries = len(entries)
    
    # Calculate top emotion
    emotions = [e.get("emotion") for e in entries if e.get("emotion")]
    top_emotion = max(set(emotions), key=emotions.count) if emotions else None
    
    # Calculate most used ambience
    ambiences = [e.get("ambience") for e in entries if e.get("ambience")]
    most_used_ambience = max(set(ambiences), key=ambiences.count) if ambiences else None
    
    # Sort entries chronologically by created_at (or id if not present) for timeline/recent extraction
    # Defaulting to sorting by id if created_at is missing, though Supabase generally guarantees created_at
    sorted_entries = sorted(entries, key=lambda x: x.get("created_at") or x.get("id"))
    
    # Nominal scoring for visualization
    emotion_scores = {
        "joy": 5, "excited": 5, "confident": 5, "inspired": 5, "euphoric": 5,
        "calm": 4, "peaceful": 4, "relaxed": 4, "content": 4, "grateful": 4,
        "neutral": 3, "contemplative": 3, "focused": 3, "reflective": 3,
        "sad": 2, "melancholy": 2, "tired": 2, "lonely": 2, "nostalgic": 2,
        "anxious": 1, "stressed": 1, "angry": 1, "frustrated": 1, "overwhelmed": 1,
        "fearful": 1
    }
    
    timeline = []
    from datetime import datetime
    for entry in sorted_entries:
        raw_date = entry.get("created_at")
        date_str = "Unknown"
        if raw_date:
            try:
                # Assuming standard ISO format from Supabase e.g. "2023-11-20T12:00:00+00:00"
                # Strip fractional seconds and timezone for simplified parsing
                time_str = raw_date.split('.')[0] 
                time_str = time_str.replace('Z', '')
                if '+' in time_str:
                    time_str = time_str.split('+')[0]
                dt = datetime.fromisoformat(time_str)
                date_str = dt.strftime("%b %d")
            except Exception:
                pass
                
        emotion = entry.get("emotion", "neutral").lower()
        score = emotion_scores.get(emotion, 3) # default to 3 if unknown
        
        timeline.append({
            "date": date_str,
            "emotion": entry.get("emotion", "Neutral").capitalize(),
            "score": score
        })

    # Collect recent keywords (from the last 5 entries)
    # Using python list slicing without reversing generator to satisfy type checkers
    sorted_entries_list = list(sorted_entries)
    recent_entries = sorted_entries_list[-5:]
    recent_entries.reverse()
    
    recent_keywords = []
    for entry in recent_entries:
        if entry.get("keywords"):
            recent_keywords.extend(entry.get("keywords"))
            
    unique_recent_keywords = list(dict.fromkeys(recent_keywords))[:10]
    
    return {
        "totalEntries": total_entries,
        "topEmotion": top_emotion,
        "mostUsedAmbience": most_used_ambience,
        "recentKeywords": unique_recent_keywords,
        "timeline": timeline
    }
