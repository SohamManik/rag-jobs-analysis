# 🇮🇳 Indian Job Market RAG

A full-stack **Retrieval-Augmented Generation** system that answers natural language questions about the Indian job market — powered by 10,000+ real job listings.

Ask questions like:
- *"What are the top skills for data science jobs in India?"*
- *"Which cities have the most ML job openings?"*
- *"What is the average salary for a Python developer?"*

The system retrieves the most relevant job listings from a vector database, feeds them as context to an LLM, and generates a grounded, data-backed answer.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **LLM** | Groq API (Llama 3.1 8B) | Answer generation |
| **Embeddings** | all-MiniLM-L6-v2 | Sentence embeddings (runs locally) |
| **Vector DB** | ChromaDB | Semantic search over job listings |
| **Backend** | FastAPI + LangChain | RAG pipeline & REST API |
| **Database** | PostgreSQL (Supabase) | Job data + query history |
| **Frontend** | React + Vite | Interactive chat UI |

---

## How RAG Works

```
User Question
     │
     ▼
┌─────────────────┐
│  Embed Question  │  ← all-MiniLM-L6-v2 converts text to 384-dim vector
└────────┬────────┘
         ▼
┌─────────────────┐
│  Vector Search   │  ← ChromaDB finds top 3 most similar job listings
└────────┬────────┘
         ▼
┌─────────────────┐
│  Build Prompt    │  ← Attach retrieved listings as context
└────────┬────────┘
         ▼
┌─────────────────┐
│  LLM Generation  │  ← Groq/Llama 3.1 generates a grounded answer
└────────┬────────┘
         ▼
   Final Answer
```

---

## Screenshots

<!-- Add your screenshots here after running the app -->
<!-- ![Screenshot](screenshots/demo.png) -->

---

## Project Structure

```
rag-job-market/
├── backend/
│   ├── config.py       # Environment variable loader
│   ├── db.py           # SQLAlchemy models (Job + QueryHistory)
│   ├── ingest.py       # One-time: loads dataset → PostgreSQL + ChromaDB
│   ├── rag.py          # Core RAG pipeline (retrieve + generate)
│   └── main.py         # FastAPI server with /query and /history endpoints
├── frontend/
│   └── src/
│       ├── App.jsx     # React UI with history sidebar
│       └── App.css     # Premium dark theme with glassmorphism
├── .env                # API keys (not committed)
└── .gitignore
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Groq API key](https://console.groq.com/) (free)
- [Supabase](https://supabase.com/) PostgreSQL database (free tier)

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/rag-job-market.git
cd rag-job-market
```

Create a `.env` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install fastapi uvicorn langchain langchain-groq langchain-chroma langchain-huggingface chromadb python-dotenv sqlalchemy psycopg2-binary datasets sentence-transformers
```

### 3. Ingest data (one-time)

```bash
python ingest.py
```
This downloads the dataset, loads it into PostgreSQL, and creates ChromaDB embeddings. Takes ~10-15 minutes on first run.

### 4. Start the backend

```bash
python main.py
```
API runs at `http://localhost:8000` — docs at `http://localhost:8000/docs`

### 5. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```
Opens at `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/query` | Ask a question → returns AI-generated answer |
| `GET` | `/history` | Get last 50 queries with timestamps |

### Example request
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the top skills for data science jobs?"}'
```

---

## Dataset

Uses the [Data Jobs](https://huggingface.co/datasets/lukebarousse/data_jobs) dataset by Luke Barousse — 10,000+ job listings with titles, companies, locations, salaries, and required skills.

---

## Built By

**Soham Manik** — BCA student, aspiring AI/ML Engineer
- Built with Python, React, and AI-assisted development tools
- Part of an ongoing journey into applied AI and RAG systems

---

## License

MIT
