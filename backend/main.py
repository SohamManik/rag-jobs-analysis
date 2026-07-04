import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
from rag import query_rag, query_rag_stream
from db import QueryHistory, sessionlocal, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    init_db()
    print("[OK] Database tables ready")
    yield
    # Shutdown: nothing to clean up

app = FastAPI(
    title="Indian Job Market RAG API",
    description="Ask questions about Indian job market data",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request / Response models ---

class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"
    stream: bool = False

class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[str]

class HistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    sources: List[str]
    created_at: str          # ISO format timestamp

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok"}

async def stream_and_log(question: str, session_id: str):
    full_answer = ""
    sources = []
    
    try:
        # We must run the generator. 
        # Since query_rag_stream is synchronous, in a real production app we'd use run_in_threadpool.
        # For simplicity, we just iterate it.
        for chunk in query_rag_stream(question, session_id):
            if chunk.startswith("\n\n__SOURCES__:"):
                sources_json = chunk.split("__SOURCES__:")[1]
                try:
                    sources = json.loads(sources_json)
                except:
                    pass
            else:
                full_answer += chunk
            yield chunk
            
        # Log to DB
        session = sessionlocal()
        try:
            record = QueryHistory(
                question=question,
                answer=full_answer,
                sources=json.dumps(sources),
            )
            session.add(record)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()
            
    except Exception as e:
        yield f"Error: {str(e)}"

@app.post("/query")
def query_endpoint(request: QueryRequest):
    try:
        if request.stream:
            return StreamingResponse(
                stream_and_log(request.question, request.session_id),
                media_type="text/event-stream"
            )
        else:
            result = query_rag(request.question, request.session_id)

            # Save to query_history table
            session = sessionlocal()
            try:
                record = QueryHistory(
                    question=result["question"],
                    answer=result["answer"],
                    sources=json.dumps(result["sources"]),
                )
                session.add(record)
                session.commit()
            except Exception:
                session.rollback()
            finally:
                session.close()

            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history", response_model=List[HistoryItem])
def get_history():
    """Return the last 50 queries, most recent first."""
    session = sessionlocal()
    try:
        rows = (
            session.query(QueryHistory)
            .order_by(QueryHistory.created_at.desc())
            .limit(50)
            .all()
        )
        return [
            HistoryItem(
                id=row.id,
                question=row.question,
                answer=row.answer,
                sources=json.loads(row.sources) if row.sources else [],
                created_at=row.created_at.isoformat() if row.created_at else "",
            )
            for row in rows
        ]
    finally:
        session.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)