import React, { useState, useEffect } from "react";
import "./App.css";

// Dynamic API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const HISTORY_KEY = "call_analysis_history_v1";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");

  // Safe localStorage initialization
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
      }

      const data = await response.json();
      const newEntry = {
        id: Date.now(),
        fileName: file.name,
        timestamp: new Date().toLocaleString(),
        result: data,
      };

      setHistory((prev) => [newEntry, ...prev]);
      setCurrentAnalysis(newEntry);
      setActivePage("analysis");
    } catch (err) {
      setErrorMsg(err.message || "Failed to analyze audio file.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all analysis history?")) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h2 className="logo">Call Analyzer</h2>
        <nav>
          <button
            className={`nav-btn ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${activePage === "analyze" ? "active" : ""}`}
            onClick={() => setActivePage("analyze")}
          >
            Analyze Call
          </button>
          <button
            className={`nav-btn ${activePage === "history" ? "active" : ""}`}
            onClick={() => setActivePage("history")}
          >
            History
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {activePage === "dashboard" && (
          <DashboardPage
            history={history}
            onNavigate={() => setActivePage("analyze")}
          />
        )}

        {activePage === "analyze" && (
          <AnalyzePage
            onUpload={handleFileUpload}
            loading={loading}
            currentAnalysis={currentAnalysis}
          />
        )}

        {activePage === "history" && (
          <HistoryPage
            history={history}
            onClear={clearHistory}
            onSelect={(item) => {
              setCurrentAnalysis(item);
              setActivePage("analysis");
            }}
          />
        )}

        {activePage === "analysis" && currentAnalysis && (
          <AnalysisDetailResult data={currentAnalysis} />
        )}
      </main>
    </div>
  );
}

// Subcomponents
function DashboardPage({ history, onNavigate }) {
  return (
    <div className="page-section">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Calls Analyzed</h3>
          <p>{history.length}</p>
        </div>
      </div>
      <button className="primary-btn" onClick={onNavigate}>
        + Analyze New Call
      </button>
    </div>
  );
}

function AnalyzePage({ onUpload, loading }) {
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) onUpload(file);
  };

  return (
    <div className="page-section">
      <h1>Analyze Audio Call</h1>
      <form onSubmit={handleSubmit} className="upload-form">
        <div
          className="drop-zone"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && document.getElementById("file-input").click()}
        >
          <input
            id="file-input"
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <p>{file ? file.name : "Click or Drag audio file here to upload"}</p>
        </div>
        <button type="submit" className="primary-btn" disabled={!file || loading}>
          {loading ? "Analyzing Audio..." : "Start Analysis"}
        </button>
      </form>
    </div>
  );
}

function HistoryPage({ history, onClear, onSelect }) {
  if (history.length === 0) {
    return (
      <div className="page-section">
        <h1>History</h1>
        <p>No previous call analysis found.</p>
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Analysis History</h1>
        <button className="danger-btn" onClick={onClear}>
          Clear History
        </button>
      </div>
      <div className="history-list">
        {history.map((item) => (
          <div key={item.id} className="history-card" onClick={() => onSelect(item)}>
            <h4>{item.fileName}</h4>
            <span>{item.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisDetailResult({ data }) {
  return (
    <div className="page-section">
      <h1>Analysis Results</h1>
      <h3>File: {data.fileName}</h3>
      <p><strong>Analyzed On:</strong> {data.timestamp}</p>
      <div className="results-box">
        <pre>{JSON.stringify(data.result, null, 2)}</pre>
      </div>
    </div>
  );
}
