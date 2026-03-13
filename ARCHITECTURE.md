# ArvyaX AI Journal - Architecture & Scaling Plan

This document details the architectural decisions and future strategies for scaling the ArvyaX AI-Assisted Journal System, minimizing LLM costs, and ensuring data security.

## 1. System Architecture Overview
The current system adopts a decoupled client-server architecture:
- **Client (Next.js)**: Handles the UI, state management, and direct HTTP communication to the backend. Next.js offers server-side rendering (SSR) capabilities if we transition to a more SEO-focused or heavily authenticated initial load.
- **Server (FastAPI)**: A high-performance Python framework suited for I/O-bound tasks (like calling the Gemini LLM and hitting external databases).
- **Database (Supabase PostgreSQL)**: Provides robust relational data storage with built-in connection pooling via Supavisor.
- **LLM (Gemini 2.5 Flash)**: Acts as the brain for analyzing text to extract emotions, summaries, and keywords.

---

## 2. Scaling to 100,000 Users

### Database Scaling
- **Connection Pooling**: FastAPI should use connection pooling (e.g., PgBouncer or Supabase's built-in Supavisor) to handle thousands of concurrent API requests without exhausting database connections.
- **Read Replicas**: The `/insights` endpoint is read-heavy. As the user base grows, we can direct read queries (like fetching historical entries for insights) to a read replica, keeping the primary database free for writes (new journal entries).
- **Indexing**: Ensure indices are created on heavily queried fields, particularly `"userId"` and `created_at` in the `journal_entries` table.

### Backend Scaling (FastAPI)
- **Statelessness**: The FastAPI application is completely stateless. It can be horizontally scaled by spinning up multiple instances behind a load balancer (e.g., AWS ALB, NGINX).
- **Rate Limiting**: The system implements endpoint-level rate limiting using `slowapi` targeting user IP addresses. For example, the `/analyze` endpoint enforces a strict 5 requests/minute limit to prevent abuse and LLM cost spikes.
- **Asynchronous Workers**: While FastAPI supports `asyncio`, blocking operations (like heavy LLM processing) should ideally be offloaded to background task queues (e.g., Celery or Redis Queue) to free up the main HTTP threads for serving other users.

### Frontend Scaling (Next.js)
- **Edge Caching & CDN**: Serve static Next.js assets via a CDN (Cloudflare, Vercel Edge Network, or AWS CloudFront) to reduce latency and origin server load.

---

## 3. Reducing LLM Costs & Caching Repeated Analysis

LLM calls are typically the most expensive part of an AI application. 

### Chunking and Batching
- Instead of analyzing every single entry immediately, we can allow users to "batch" their daily entries and run analysis once at the end of the day.

### Caching Strategy
- **Exact Match Caching**: To minimize LLM costs and slash latency, every text submitted to the `/analyze` endpoint is hashed using SHA-256. This hash is queried against the `analysis_cache` table in Supabase. If the text was previously analyzed, the cached JSON response is instantly streamed back, bypassing Gemini completely. 
- **Semantic Caching**: In the future, implement a semantic cache (e.g., RedisVL or a lightweight vector DB) that stores previous inputs and their generated JSON. If a new entry is >95% semantically similar to a cached entry, return the cached emotion, keywords, and summary instead of invoking Gemini. 

### Model Selection & Streaming
- We are currently using `gemini-2.5-flash`, which is optimized for speed and cost. Continually monitor usage to ensure we utilize the most cost-effective tier available while maintaining quality responses.
- **Server-Sent Events (SSE)**: The backend uses Gemini's `generate_content_stream` to stream JSON chunks using FastAPI's `StreamingResponse`. The Next.js frontend catches these chunks, progressively parsing partial JSON to provide immediate visual feedback via a "typing" effect for the `summary`, drastically reducing *perceived* latency.

---

## 4. Protecting Sensitive Data

Journal entries are highly personal and sensitive. Security must be a top priority.

### Data Encryption
- **In Transit**: Enforce strict TLS/HTTPS for all communications between the Frontend, Backend, Supabase, and Gemini API.
- **At Rest**: Ensure that Supabase storage is encrypted at rest (AES-256).
- **Application Level Encryption**: For extreme privacy, implement Application-Level Encryption (ALE). Before saving the `text` and `summary` to Supabase, encrypt them using a user-specific KMS key. The backend would only decrypt them in memory when requested by the authenticated owner. Note: This means the backend cannot perform arbitrary text searches across user journals.

### Authentication & Authorization
- **Implementation**: Integrate an identity provider (e.g., Supabase Auth, Clerk, or Auth0) on both the frontend and backend.
- **Verification**: The FastAPI endpoints currently accept `userId` in the payload. This is insecure. The backend must validate a JWT Bearer token in the `Authorization` header on every request to guarantee that the requester is strongly authenticated and holds the rights to access that specific `userId`'s data.

### LLM Data Privacy
- **Opt-Outs**: Ensure that the agreement with the LLM provider (Google) explicitly states that API data is *not* used to train their foundational models.
- **PII Scrubbing**: Implement an intermediate scrubbing layer (like Microsoft Presidio or a lightweight regex scrubber) to remove Names, SSNs, phone numbers, and addresses from the journal text *before* sending it to the Gemini API for emotional analysis.

---

## 5. Deployment & Containerization

### Docker Compose
- **Backend**: Containerized in a lightweight `python:3.10-slim` image using Uvicorn. The `0.0.0.0` host binding ensures it's reachable on port `8000` via the internal Docker network or the host mapping.
- **Frontend**: The Next.js client uses a **Multi-Stage Dockerfile** targeting the `standalone` output trace. The `node:20-alpine` builds the necessary production files and then moves exclusively the `.next/standalone`, `.next/static`, and `public` folders into the final image under a non-root `nextjs` user. This yields an exceptionally small and secure Docker image.
- **Environment Context**: Because Next.js server components require network pathways during runtime and build-time context for static rendering, `NEXT_PUBLIC_API_URL=http://localhost:8000/api/journal` is mapped inside the `docker-compose.yml` to assure the browser calls correctly resolve the host machine's port mapping.
