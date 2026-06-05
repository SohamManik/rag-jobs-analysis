// App.jsx
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import "./App.css"

const API_URL = "http://localhost:8000"

function App() {
  const [question, setQuestion]       = useState("")
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [history, setHistory]         = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeId, setActiveId]       = useState(null)
  const [elapsed, setElapsed]         = useState(0)
  const timerRef = useRef(null)

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
  async function handleAsk() {
    if (!question.trim()) return
    setLoading(true)
    setResult(null)
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
        body: JSON.stringify({ question }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Something went wrong")
      }

      const data = await res.json()
      setResult(data)
      // Refresh history after a successful query
      fetchHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(timerRef.current)
      timerRef.current = null
      setLoading(false)
    }
  }

  // Press Enter to submit (Shift+Enter for newline)
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
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
                {loading ? "Thinking…" : "Ask"}
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="loading-container">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="loading-info">
                <span className="loading-text">
                  {elapsed < 10
                    ? "Analyzing job market data\u2026"
                    : elapsed < 30
                    ? "Searching through 10,000 listings\u2026"
                    : "Almost there \u2014 generating answer\u2026"}
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
                <ReactMarkdown className="answer-text">
                  {result.answer}
                </ReactMarkdown>
              </div>

              {result.sources.length > 0 && result.sources[0] !== "unknown" && (
                <div className="sources">
                  <span className="sources-label">Sources:</span>
                  {result.sources.map((src, i) => (
                    <span key={i} className="source-tag">{src}</span>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default App