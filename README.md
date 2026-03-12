# AI-Assisted Journal System - ArvyaX

A full-stack daily journaling application that leverages generative AI to analyze user entries, extract emotions, and provide mindset insights.

## Tech Stack
- **Frontend**: Next.js (React), TailwindCSS, Lucide Icons
- **Backend**: Python FastAPI, Uvicorn
- **Database**: Supabase (PostgreSQL)
- **AI / LLM**: Google Gemini (via `google-genai` SDK)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python 3.10+
- A Supabase account and project
- A Google Gemini API Key

### 2. Supabase Setup
1. Create a new project in Supabase.
2. Go to the **SQL Editor** and run the following script to create the required table:

```sql
CREATE TABLE journal_entries (
  id uuid default gen_random_uuid() primary key,
  "userId" text not null,
  ambience text,
  text text not null,
  emotion text,
  keywords text[],
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

3. Obtain your `Project URL` and `service_role` key from Project Settings > API.

### 3. Environment Variables
Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

---

### 4. Running the Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
The Backend API will be running at `http://localhost:8000`. You can view the swagger docs at `http://localhost:8000/docs`.

---

### 5. Running the Frontend (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
The frontend will be available at `http://localhost:3000`. You can now open this in your browser to start journaling!

---

## 🐋 Docker Setup (Alternative)
You can run the entire stack using Docker Compose. See the `docker-compose.yml` file in the root for details.

```bash
docker-compose up --build
```
This will spin up both the Next.js frontend and the FastAPI backend simultaneously.
