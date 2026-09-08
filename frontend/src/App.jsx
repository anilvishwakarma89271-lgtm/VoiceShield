import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
const HISTORY_KEY = "voiceshield_incident_history";

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [historySearch, setHistorySearch] = useState("");
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(Array.isArray(saved) ? saved : []);
    } catch {
      setHistory([]);
    }
  }, []);

  const saveIncident = (data) => {
    const incident = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      filename: data.filename || file?.name || "Unknown audio",
      riskLevel: data.final_risk_assessment?.risk_level || "UNKNOWN",
      finalRisk: data.final_risk_assessment?.final_risk ?? 0,
      action: data.final_risk_assessment?.action || "REVIEW",
      spoofScore: data.voice_detection?.average_spoof_probability ?? 0,
      reliability: data.voice_detection?.reliability ?? 0,
      latency: data.voice_detection?.latency_ms ?? 0,
      windows: data.voice_detection?.windows_analyzed ?? 0,
      indicators: data.detected_indicators || [],
    };

    setHistory((current) => {
      const updated = [incident, ...current].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("audio/")) {
      setError("Please upload a valid audio file.");
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const analyzeCall = async () => {
    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (transcript.trim()) {
        formData.append("transcript", transcript.trim());
      }

      const response = await fetch(`${API_URL}/analyze-call`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      saveIncident(data);
      setActivePage("dashboard");
    } catch (err) {
      console.error("VoiceShield analysis error:", err);
      setError(
        "Could not connect to VoiceShield backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRisk = () => {
    if (!result?.final_risk_assessment) {
      return { level: "READY", score: "--", action: "UPLOAD AUDIO" };
    }

    return {
      level: result.final_risk_assessment.risk_level || "UNKNOWN",
      score:
        result.final_risk_assessment.final_risk !== undefined
          ? Math.round(result.final_risk_assessment.final_risk * 100)
          : "--",
      action: result.final_risk_assessment.action || "REVIEW",
    };
  };

  const risk = getRisk();

  const riskClass =
    risk.level === "CRITICAL"
      ? "critical"
      : risk.level === "HIGH"
        ? "high"
        : risk.level === "MEDIUM"
          ? "medium"
          : risk.level === "LOW"
            ? "low"
            : "ready";

  const voiceScore =
    result?.voice_detection?.average_spoof_probability !== undefined
      ? Math.round(result.voice_detection.average_spoof_probability * 100)
      : "--";

  const reliability =
    result?.voice_detection?.reliability !== undefined
      ? Math.round(result.voice_detection.reliability * 100)
      : "--";

  const latency =
    result?.voice_detection?.latency_ms !== undefined
      ? Math.round(result.voice_detection.latency_ms)
      : "--";

  const windows =
    result?.voice_detection?.windows_analyzed !== undefined
      ? result.voice_detection.windows_analyzed
      : "--";

  const clearHistory = () => {
    if (!window.confirm("Clear all saved VoiceShield incident history?")) return;
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return history.filter((incident) => {
      const matchesFilter =
        historyFilter === "ALL" || incident.riskLevel === historyFilter;

      const matchesSearch =
        !query ||
        incident.filename?.toLowerCase().includes(query) ||
        incident.action?.toLowerCase().includes(query) ||
        incident.indicators?.some((item) =>
          item.toLowerCase().includes(query)
        );

      return matchesFilter && matchesSearch;
    });
  }, [history, historyFilter, historySearch]);

  const analytics = useMemo(() => {
    const total = history.length;
    const critical = history.filter((x) => x.riskLevel === "CRITICAL").length;
    const high = history.filter((x) => x.riskLevel === "HIGH").length;
    const medium = history.filter((x) => x.riskLevel === "MEDIUM").length;
    const low = history.filter((x) => x.riskLevel === "LOW").length;

    const averageRisk =
      total > 0
        ? Math.round(
            (history.reduce((sum, item) => sum + Number(item.finalRisk || 0), 0) /
              total) *
              100
          )
        : 0;

    const averageSpoof =
      total > 0
        ? Math.round(
            (history.reduce(
              (sum, item) => sum + Number(item.spoofScore || 0),
              0
            ) /
              total) *
              100
          )
        : 0;

    const averageReliability =
      total > 0
        ? Math.round(
            (history.reduce(
              (sum, item) => sum + Number(item.reliability || 0),
              0
            ) /
              total) *
              100
          )
        : 0;

    return {
      total,
      critical,
      high,
      medium,
      low,
      averageRisk,
      averageSpoof,
      averageReliability,
      priority: critical + high,
    };
  }, [history]);

  const navigate = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const RiskGauge = ({ score }) => {
    const numericScore = typeof score === "number" ? score : 0;
    const circumference = 264;
    const offset = circumference - (circumference * numericScore) / 100;

    return (
      <div className="risk-gauge" aria-label={`Risk score ${numericScore}%`}>
        <svg viewBox="0 0 100 100">
          <circle className="gauge-bg" cx="50" cy="50" r="42" />
          <circle
            className="gauge-progress"
            cx="50"
            cy="50"
            r="42"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="gauge-value">
          <strong>{score === "--" ? "--" : `${score}%`}</strong>
          <span>RISK</span>
        </div>
      </div>
    );
  };

  const AnalyzePage = () => (
    <section className="workspace">
      <div className="panel analysis-panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">AUDIO ANALYSIS</div>
            <h3>Analyze a Call</h3>
          </div>
          <div className="model-badge">
            <span />
            AASIST-L
          </div>
        </div>

        <div
          className={`dropzone ${dragActive ? "drag-active" : ""} ${
            file ? "has-file" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            hidden
          />

          <div className="upload-icon">{file ? "✓" : "↑"}</div>

          {file ? (
            <>
              <strong>{file.name}</strong>
              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB • Audio ready
              </span>
            </>
          ) : (
            <>
              <strong>Drop call audio here</strong>
              <span>or choose an audio file from your computer</span>
            </>
          )}

          <label htmlFor="audio-upload" className="browse-btn">
            {file ? "CHANGE AUDIO" : "BROWSE FILES"}
          </label>
        </div>

        <div className="transcript-section">
          <label>OPTIONAL CALL TRANSCRIPT</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste a transcript here to enable context and action risk analysis..."
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="analyze-btn" onClick={analyzeCall} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" />
              ANALYZING AUDIO...
            </>
          ) : (
            <>
              <span>◈</span>
              ANALYZE CALL
            </>
          )}
        </button>
      </div>

      <div className="panel intelligence-panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">THREAT INTELLIGENCE</div>
            <h3>Analysis Overview</h3>
          </div>
          <span className="status-chip">{result ? "COMPLETE" : "STANDBY"}</span>
        </div>

        <div className="intelligence-list">
          <div className="intel-row">
            <div className="intel-icon">AI</div>
            <div>
              <strong>Voice Detection</strong>
              <span>
                {result
                  ? "AASIST-L analysis completed"
                  : "Waiting for audio analysis"}
              </span>
            </div>
            <b>{result ? "DONE" : "IDLE"}</b>
          </div>

          <div className="intel-row">
            <div className="intel-icon">CTX</div>
            <div>
              <strong>Context Risk</strong>
              <span>
                {result
                  ? `${result.detected_indicators?.length || 0} indicators detected`
                  : "Transcript analysis pending"}
              </span>
            </div>
            <b>{result ? "READY" : "WAIT"}</b>
          </div>

          <div className="intel-row">
            <div className="intel-icon">ACT</div>
            <div>
              <strong>Action Risk</strong>
              <span>
                {result
                  ? "Sensitive action assessment available"
                  : "Waiting for analysis"}
              </span>
            </div>
            <b>{result ? "READY" : "WAIT"}</b>
          </div>

          <div className="intel-row">
            <div className="intel-icon">RSK</div>
            <div>
              <strong>Risk Engine</strong>
              <span>
                {result
                  ? "Final risk decision generated"
                  : "Awaiting voice intelligence"}
              </span>
            </div>
            <b>{result ? "ACTIVE" : "IDLE"}</b>
          </div>
        </div>

        <div className="decision-box">
          <div className="decision-title">SECURITY DECISION</div>
          <div className={`decision-status ${riskClass}`}>
            <div className="decision-circle">!</div>
            <div>
              <strong>
                {result ? `Action: ${risk.action}` : "No active threat assessment"}
              </strong>
              <span>
                {result
                  ? `Final risk level: ${risk.level}`
                  : "Upload and analyze call audio to begin"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const DashboardPage = () => (
    <>
      <section className="hero-grid">
        <div className="welcome-card">
          <div className="shield-large">◈</div>
          <div>
            <div className="eyebrow">VOICE AUTHENTICITY ENGINE</div>
            <h3>Detect cloned & manipulated voices.</h3>
            <p>
              Analyze suspicious call audio using AASIST-L and combine voice
              signals with contextual risk indicators.
            </p>
            <div className="hero-tags">
              <span>VOICE AI</span>
              <span>CONTEXT RISK</span>
              <span>REAL-TIME DECISION</span>
            </div>
          </div>
        </div>

        <div className={`risk-card ${riskClass}`}>
          <div className="risk-label">CURRENT RISK</div>
          <div className="risk-main">
            <div className="risk-info">
              <strong>{risk.level}</strong>
              <div className="risk-score-track">
                <div
                  className="risk-score-fill"
                  style={{
                    width: risk.score === "--" ? "0%" : `${risk.score}%`,
                  }}
                />
              </div>
            </div>
            <RiskGauge score={risk.score} />
          </div>
          <div className="risk-action">
            <span>RECOMMENDED ACTION</span>
            <strong>{risk.action}</strong>
          </div>
        </div>
      </section>

      <section className="metrics">
        <div className="metric">
          <span className="metric-icon">◉</span>
          <div>
            <small>VOICE SPOOF SCORE</small>
            <strong>{voiceScore === "--" ? "--" : `${voiceScore}%`}</strong>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">◌</span>
          <div>
            <small>AUDIO RELIABILITY</small>
            <strong>{reliability === "--" ? "--" : `${reliability}%`}</strong>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">ϟ</span>
          <div>
            <small>DETECTION LATENCY</small>
            <strong>{latency === "--" ? "--" : `${latency} ms`}</strong>
          </div>
        </div>
        <div className="metric">
          <span className="metric-icon">▦</span>
          <div>
            <small>WINDOWS ANALYZED</small>
            <strong>{windows}</strong>
          </div>
        </div>
      </section>

      <AnalyzePage />

      <section className="bottom-grid">
        <div className="mini-panel">
          <span>MODEL</span>
          <strong>AASIST-L</strong>
          <small>Speech anti-spoofing</small>
        </div>
        <div className="mini-panel">
          <span>SAMPLE RATE</span>
          <strong>16 kHz</strong>
          <small>Standardized audio input</small>
        </div>
        <div className="mini-panel">
          <span>RISK ENGINE</span>
          <strong>ACTIVE</strong>
          <small>Voice + context + action</small>
        </div>
        <div className="mini-panel">
          <span>INCIDENTS</span>
          <strong>{history.length}</strong>
          <small>Stored security events</small>
        </div>
      </section>
    </>
  );

  const IncidentHistoryPage = () => (
    <section className="page-panel">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SECURITY RECORDS</div>
          <h2>Incident History</h2>
          <p>Previously analyzed calls and generated security decisions.</p>
        </div>
        <div className="heading-actions">
          <div className="history-count">{history.length} INCIDENT{history.length !== 1 ? "S" : ""}</div>
          {history.length > 0 && (
            <button className="ghost-danger-btn" onClick={clearHistory}>
              CLEAR HISTORY
            </button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="history-toolbar">
          <input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search filename, action or indicator..."
          />
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
          >
            <option value="ALL">All severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      )}

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◷</div>
          <h3>No incidents recorded</h3>
          <p>Analyze a call to create your first security incident.</p>
          <button className="primary-small-btn" onClick={() => navigate("analyze")}>
            ANALYZE FIRST CALL
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="empty-state compact">
          <div className="empty-icon">⌕</div>
          <h3>No matching incidents</h3>
          <p>Try another search term or severity filter.</p>
        </div>
      ) : (
        <div className="incident-list">
          {filteredHistory.map((incident) => (
            <div className="incident-card" key={incident.id}>
              <div className={`incident-icon ${incident.riskLevel.toLowerCase()}`}>
                {incident.riskLevel === "CRITICAL" || incident.riskLevel === "HIGH" ? "!" : "◈"}
              </div>

              <div className="incident-main">
                <strong>{incident.filename}</strong>
                <span>{incident.timestamp}</span>
                <small>
                  {incident.indicators.length} threat indicator
                  {incident.indicators.length !== 1 ? "s" : ""}
                </small>
              </div>

              <div className={`history-risk ${incident.riskLevel.toLowerCase()}`}>
                <strong>{incident.riskLevel}</strong>
                <span>{Math.round(incident.finalRisk * 100)}%</span>
              </div>

              <div className="incident-action">{incident.action}</div>

              <button
                className="details-btn"
                onClick={() =>
                  setShowDetails(showDetails === incident.id ? null : incident.id)
                }
              >
                {showDetails === incident.id ? "HIDE" : "DETAILS"}
              </button>

              {showDetails === incident.id && (
                <div className="incident-details">
                  <div><span>SPOOF SCORE</span><strong>{Math.round(incident.spoofScore * 100)}%</strong></div>
                  <div><span>RELIABILITY</span><strong>{Math.round(incident.reliability * 100)}%</strong></div>
                  <div><span>LATENCY</span><strong>{Math.round(incident.latency)} ms</strong></div>
                  <div><span>WINDOWS</span><strong>{incident.windows}</strong></div>
                  <div className="detail-wide">
                    <span>INDICATORS</span>
                    <strong>{incident.indicators.length ? incident.indicators.join(" • ") : "None detected"}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const RiskAnalyticsPage = () => {
    const bars = [
      ["CRITICAL", analytics.critical, "critical"],
      ["HIGH", analytics.high, "high"],
      ["MEDIUM", analytics.medium, "medium"],
      ["LOW", analytics.low, "low"],
    ];

    return (
      <section className="page-panel">
        <div className="page-heading">
          <div>
            <div className="eyebrow">SECURITY INTELLIGENCE</div>
            <h2>Risk Analytics</h2>
            <p>Aggregate analysis of VoiceShield security events.</p>
          </div>
          <div className="analytics-live">
            <span />
            LIVE DATA
          </div>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <span>TOTAL INCIDENTS</span>
            <strong>{analytics.total}</strong>
            <small>Recorded analyses</small>
          </div>
          <div className="analytics-card">
            <span>AVERAGE RISK</span>
            <strong>{analytics.averageRisk}%</strong>
            <small>Final risk score</small>
          </div>
          <div className="analytics-card">
            <span>AVG SPOOF SCORE</span>
            <strong>{analytics.averageSpoof}%</strong>
            <small>AASIST-L signal</small>
          </div>
          <div className="analytics-card">
            <span>HIGH PRIORITY</span>
            <strong>{analytics.priority}</strong>
            <small>High + critical events</small>
          </div>
        </div>

        <div className="analytics-main-grid">
          <div className="risk-breakdown">
            <div className="breakdown-header">
              <div>
                <div className="eyebrow">RISK DISTRIBUTION</div>
                <h3>Incident Severity</h3>
              </div>
              <span>{analytics.total} total</span>
            </div>

            <div className="risk-bars">
              {bars.map(([label, count, type]) => (
                <div className="risk-bar-row" key={label}>
                  <span>{label}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${type}`}
                      style={{
                        width:
                          analytics.total > 0
                            ? `${(count / analytics.total) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-side-card">
            <div className="eyebrow">SYSTEM QUALITY</div>
            <h3>Analysis Reliability</h3>
            <div className="quality-value">{analytics.averageReliability}%</div>
            <div className="quality-track">
              <div style={{ width: `${analytics.averageReliability}%` }} />
            </div>
            <p>Average audio reliability across recorded incidents.</p>
          </div>
        </div>

        <div className="recent-trend">
          <div className="breakdown-header">
            <div>
              <div className="eyebrow">RECENT EVENTS</div>
              <h3>Risk Timeline</h3>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="timeline-empty">No events available yet.</div>
          ) : (
            <div className="timeline">
              {history.slice(0, 8).map((incident) => (
                <div className="timeline-item" key={incident.id}>
                  <div className={`timeline-dot ${incident.riskLevel.toLowerCase()}`} />
                  <div>
                    <strong>{incident.riskLevel} • {Math.round(incident.finalRisk * 100)}%</strong>
                    <span>{incident.filename}</span>
                  </div>
                  <small>{incident.timestamp}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const SettingsPage = () => (
    <section className="page-panel">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SYSTEM CONTROL</div>
          <h2>Settings</h2>
          <p>VoiceShield system configuration and status.</p>
        </div>
      </div>

      <div className="settings-list">
        <div className="setting-row">
          <div>
            <strong>AASIST-L Detector</strong>
            <span>Speech anti-spoofing engine</span>
          </div>
          <b className="online-badge">ACTIVE</b>
        </div>
        <div className="setting-row">
          <div>
            <strong>Risk Engine</strong>
            <span>Voice + context + action fusion</span>
          </div>
          <b className="online-badge">ACTIVE</b>
        </div>
        <div className="setting-row">
          <div>
            <strong>FastAPI Backend</strong>
            <span>Local security analysis API • Port 8000</span>
          </div>
          <b className="online-badge">ONLINE</b>
        </div>
        <div className="setting-row">
          <div>
            <strong>Incident Storage</strong>
            <span>Browser local storage • 50 records max</span>
          </div>
          <b className="online-badge">READY</b>
        </div>
      </div>

      <div className="settings-note">
        <span>ⓘ</span>
        <div>
          <strong>Demo environment</strong>
          <p>
            VoiceShield is running locally. Incident history is stored in this
            browser and can be cleared from the Incident History page.
          </p>
        </div>
      </div>
    </section>
  );

  const getPageTitle = () => {
    if (activePage === "history") return "Incident History";
    if (activePage === "analytics") return "Risk Analytics";
    if (activePage === "settings") return "System Settings";
    if (activePage === "analyze") return "Analyze Call";
    return "Voice Threat Dashboard";
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">VS</div>
          <div>
            <h1>VoiceShield</h1>
            <span>AI VOICE SECURITY</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-title">SECURITY CONSOLE</div>

          <button className={`nav-item ${activePage === "dashboard" ? "active" : ""}`} onClick={() => navigate("dashboard")}>
            <span>⌂</span> Dashboard
          </button>
          <button className={`nav-item ${activePage === "analyze" ? "active" : ""}`} onClick={() => navigate("analyze")}>
            <span>◉</span> Analyze Call
          </button>
          <button className={`nav-item ${activePage === "history" ? "active" : ""}`} onClick={() => navigate("history")}>
            <span>◷</span> Incident History
            {history.length > 0 && <em>{history.length}</em>}
          </button>
          <button className={`nav-item ${activePage === "analytics" ? "active" : ""}`} onClick={() => navigate("analytics")}>
            <span>◈</span> Risk Analytics
          </button>

          <div className="nav-title lower">SYSTEM</div>

          <button className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}>
            <span>⚙</span> Settings
          </button>
        </nav>

        <div className="system-card">
          <div className="status-dot" />
          <div>
            <strong>System Online</strong>
            <span>AASIST-L active</span>
          </div>
        </div>

        <div className="sidebar-footer">
          VoiceShield Security Engine
          <br />
          v1.0 • SIH 2026
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">SECURITY OPERATIONS CENTER</div>
            <h2>{getPageTitle()}</h2>
          </div>
          <div className="top-status">
            <span className="live-dot" />
            LIVE MONITORING
          </div>
        </header>

        {activePage === "dashboard" && <DashboardPage />}
        {activePage === "analyze" && <AnalyzePage />}
        {activePage === "history" && <IncidentHistoryPage />}
        {activePage === "analytics" && <RiskAnalyticsPage />}
        {activePage === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
