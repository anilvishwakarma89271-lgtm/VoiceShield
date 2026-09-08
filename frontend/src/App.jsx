import React, { useState, useRef } from 'react';
import { ShieldAlert, Upload, Activity } from 'lucide-react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://voiceshield-1j6d.onrender.com';

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an audio file first!");

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setResult(data);
    } catch (err) {
      alert("Error processing audio: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="logo-section">
          <Activity className="logo-icon" />
          <span className="logo-text">VOICESHIELD</span>
        </div>
        
        <nav className="nav-links">
          <a className="nav-link" href="#home">Home</a>
          <a className="nav-link" href="#tech">Tech</a>
          <a className="nav-link" href="#solutions">Solutions</a>
          <a className="nav-link" href="#api">API</a>
          <a className="nav-link" href="#pricing">Pricing</a>
        </nav>

        <button className="scan-now-btn">SCAN NOW</button>
      </header>

      {/* Main Hero Container */}
      <main className="hero-container">
        <p className="hero-subtag">Your trusted shield against voice fraud.</p>
        <h1 className="hero-title">
          VOICESHIELD - <span className="title-gradient">AI Voice Detection</span>
        </h1>
        <h2 className="hero-section-heading">Test an Audio File</h2>

        {/* Upload Form */}
        <form onSubmit={handleFileUpload}>
          <div className="upload-container">
            <div className="upload-inner" onClick={() => fileInputRef.current.click()}>
              <Upload className="upload-icon" />
              <div className="upload-main-text">DROP OR UPLOAD AUDIO</div>
              <div className="upload-sub-text">
                {file ? `Selected: ${file.name}` : "Supports .wav, .mp3, .m4a (Max 50MB)"}
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                className="file-input-hidden"
                onChange={(e) => setFile(e.target.files[0])} 
              />
            </div>
          </div>

          <div className="action-btn-container">
            <button type="submit" className="start-analysis-btn" disabled={loading}>
              {loading ? "ANALYZING..." : "START ANALYSIS"}
            </button>
          </div>
        </form>

        {/* Clean Result Display */}
        {result && (
          <div className="results-card-modern">
            <h3 style={{ color: '#38bdf8', marginBottom: '16px' }}>Analysis Results</h3>
            
            <div className="grid-metrics">
              <div className="metric-box">
                <div className="metric-label">File Name</div>
                <div className="metric-value">{result.file_name || 'N/A'}</div>
              </div>

              <div className="metric-box">
                <div className="metric-label">Duration</div>
                <div className="metric-value">{result.duration || 'N/A'}</div>
              </div>

              <div className="metric-box">
                <div className="metric-label">Sentiment</div>
                <div className="metric-value" style={{ color: '#22c55e' }}>
                  {result.sentiment || 'N/A'}
                </div>
              </div>
            </div>

            <div className="metric-box" style={{ marginTop: '16px' }}>
              <div className="metric-label">Summary</div>
              <p style={{ marginTop: '6px', color: '#f8fafc' }}>
                {result.summary || 'No summary available'}
              </p>
            </div>

            <div className="metric-box" style={{ marginTop: '16px' }}>
              <div className="metric-label">Transcription</div>
              <p style={{ marginTop: '6px', color: '#f8fafc' }}>
                {result.transcription || 'No transcription generated'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Recent Analyses Box */}
      <div className="recent-analyses-box">
        <div className="recent-header">
          <span>Recent Analyses</span>
          <span>...</span>
        </div>
        <div className="recent-list">
          <div className="recent-item">Row 1: File_A.mp3 - <strong style={{color:'#ef4444'}}>94% AI</strong></div>
          <div className="recent-item">Row 2: Recording_1.wav - <strong style={{color:'#22c55e'}}>89% Human</strong></div>
          <div className="recent-item">Row 3: Deepfake_01.mp3 - <strong style={{color:'#ef4444'}}>98% Deepfake</strong></div>
        </div>
      </div>
    </div>
  );
}

export default App;
