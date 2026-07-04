# Indian Job Market RAG 🚀

An AI-powered Retrieval-Augmented Generation (RAG) full-stack application designed to analyze the Indian Data Job Market. This platform allows users to query thousands of job postings to instantly discover top skills, salary trends, and hiring companies using natural language.

Built to bridge the gap between job seekers and the actual demands of the industry.

## 🛠️ Tech Stack

- **Frontend:** React + Vite, customized with a modern, glassmorphic UI.
- **Backend:** FastAPI (Python), serving asynchronous Server-Sent Events (SSE) for real-time AI streaming.
- **AI/LLM:** Groq (Llama 3.1 8B Instant) via LangChain for lightning-fast inference.
- **Vector Database:** ChromaDB with local HuggingFace Embeddings (`all-MiniLM-L6-v2`) for zero-cost, high-speed semantic search.
- **Relational Database:** PostgreSQL (Supabase) to store historical job data.

## ✨ Features

- **Real-Time Streaming:** Responses stream token-by-token directly to the UI, providing a ChatGPT-like experience.
- **Conversational Memory:** The AI remembers your session history, allowing for natural follow-up questions.
- **Markdown Tables:** AI responses that include comparative data (e.g., salaries across cities) are automatically formatted into beautiful CSS-styled tables.
- **100% Free Hosting Architecture:** Designed to be deployed entirely on free tiers (Render + Vercel + Supabase).

## 🚀 Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # (Windows)
pip install -r requirements.txt
```

Set up your `.env` file in the `backend` folder:
```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=your_supabase_postgres_url
```

Run the FastAPI server:
```bash
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 🌐 Deployment Strategy

This project is architected to be deployed easily for free:
- **Frontend:** Deploy the `/frontend` folder to [Vercel](https://vercel.com/). Vercel will automatically detect the Vite framework and build it.
- **Backend:** Deploy the `/backend` folder to [Render](https://render.com/) as a Web Service. Since the Chroma vector database is checked into the repository, Render can read it as static files during runtime!

---
*Built by Soham Manik for the Indian Job Market.*
