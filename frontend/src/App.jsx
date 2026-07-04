import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import "./App.css"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function generateSessionId() {
  return "session-" + Math.random().toString(36).substring(2, 10);
}

function App() {
  const [question, setQuestion]       = useState("")
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [history, setHistory]         = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeId, setActiveId]       = useState(null)
  const [elapsed, setElapsed]         = useState(0)
  
  const [sessionId] = useState(() => generateSessionId())

  const timerRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll when answer updates
  useEffect(() => {
    if (result && result.answer) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [result?.answer])

  // Fetch history on mount
  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_URL}/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch {
      // Silently fail — history is non-critical
    }
  }

  // Ask a new question
  async function handleAsk(queryOverride = null) {
    // If it's an event (like onClick), queryOverride might be the event object. Check if it's a string.
    const q = typeof queryOverride === 'string' ? queryOverride : question
    if (!q.trim()) return
    
    setQuestion(q)
    setLoading(true)
    setResult({ question: q, answer: "", sources: [] })
    setError(null)
    setActiveId(null)
    setElapsed(0)

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)

    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: q,
          session_id: sessionId,
          stream: true
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Something went wrong")
      }

      setLoading(false) // Data is streaming now, stop generic loading indicator
      clearInterval(timerRef.current)
      timerRef.current = null

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullAnswer = ""
      let finalSources = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        if (chunk.includes("__SOURCES__:")) {
          const parts = chunk.split("__SOURCES__:")
          fullAnswer += parts[0]
          try {
            finalSources = JSON.parse(parts[1])
          } catch(e) {}
        } else {
          fullAnswer += chunk
        }

        setResult(prev => ({
          ...prev,
          answer: fullAnswer,
          sources: finalSources
        }))
      }

      // Refresh history after a successful query stream finishes
      fetchHistory()
      setQuestion("") // Clear input for next question

    } catch (err) {
      setError(err.message)
      setLoading(false)
      clearInterval(timerRef.current)
      timerRef.current = null
    } 
  }

  // Press Enter to submit (Shift+Enter for newline)
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  function handleSuggestionClick(text) {
    handleAsk(text)
  }

  // Click a history item to view it
  function handleHistoryClick(item) {
    setResult({
      question: item.question,
      answer: item.answer,
      sources: item.sources,
    })
    setActiveId(item.id)
    setError(null)
  }

  // Format timestamp for display
  function formatTime(isoString) {
    if (!isoString) return ""
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay when sidebar is open */}
      {showSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowSidebar(false)}
          style={{ display: "none" }}   // shown via CSS media query
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${showSidebar ? "" : "collapsed"}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Query History</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setShowSidebar(false)}
            title="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">💬</div>
              <div>No queries yet.<br/>Ask a question to get started!</div>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`history-item ${activeId === item.id ? "active" : ""}`}
                onClick={() => handleHistoryClick(item)}
              >
                <div className="history-item-question">{item.question}</div>
                <div className="history-item-time">{formatTime(item.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="container">

          {/* Header */}
          <div className="header">
            {!showSidebar && (
              <button
                className="history-toggle-btn"
                onClick={() => setShowSidebar(true)}
                title="Show history"
              >
                ☰
              </button>
            )}
            <div className="header-text">
              <h1 className="title">Indian Job Market RAG</h1>
              <p className="subtitle">
                Ask questions about jobs, skills, salaries &amp; trends
              </p>
            </div>
          </div>

          {/* Search box */}
          <div className="search-box">
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. What are the top skills for data science jobs in India?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="search-actions">
              <button className="btn" onClick={handleAsk} disabled={loading}>
                {loading ? "Connecting…" : "Ask"}
              </button>
            </div>
          </div>

          {/* Suggestion Chips */}
          {!result && !loading && (
            <div className="suggestion-chips">
              <button onClick={() => handleSuggestionClick("What are the top skills for Data Scientists?")}>Top Skills</button>
              <button onClick={() => handleSuggestionClick("What is the average salary in Bangalore?")}>Salaries in Bangalore</button>
              <button onClick={() => handleSuggestionClick("Which companies are hiring for remote jobs?")}>Remote Companies</button>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="loading-container">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="loading-info">
                <span className="loading-text">
                  {elapsed < 10
                    ? "Searching vector database\u2026"
                    : elapsed < 30
                    ? "Retrieving context\u2026"
                    : "Connecting to AI model\u2026"}
                </span>
                <span className="loading-timer">{elapsed}s</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <div className="error">⚠ {error}</div>}

          {/* Result card */}
          {result && (
            <div className="result-card">
              <div className="result-section">
                <div className="result-label">
                  <span className="result-label-icon">❓</span> Question
                </div>
                <p className="question-text">{result.question}</p>
              </div>

              <div className="result-section">
                <div className="result-label">
                  <span className="result-label-icon">💡</span> Answer
                </div>
                <div className="answer-wrapper">
                  {!result.answer && !loading && <span className="blinking-cursor">|</span>}
                  {result.answer && (
                    <div className="answer-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.answer}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {result.sources.length > 0 && result.sources[0] !== "unknown" && (
                <div className="sources">
                  <span className="sources-label">Sources:</span>
                  {result.sources.map((src, i) => (
                    <span key={i} className="source-tag">{src}</span>
                  ))}
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default App