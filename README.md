# Klean Data

**KD** — Chat with your databases using natural language.

## Features
- Connect to PostgreSQL, MySQL, SQLite, MongoDB
- Upload CSV/Excel files
- Natural Language → SQL / MongoDB queries
- Human-in-the-Loop approval flow — nothing runs without your OK
- Parallel chunk processing for large datasets (1M+ rows)

## Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --port 8766

# Frontend
npm install && npm run dev
```

## Stack
- Frontend: React 18 + TypeScript + Vite 6
- Backend: FastAPI + Motor + asyncpg + pandas
- AI: Auto-rotating free LLM keys (GPT → Gemini → others)
