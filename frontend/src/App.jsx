import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <h2>Call Analyzer</h2>
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze')}
          >
            Analyze Call
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="main-content">
        {activeTab === 'dashboard' && (
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>
              Welcome to Voice Call Threat & AI Detector
            </p>
            <div className="card">
              <h3>System Status</h3>
              <p style={{ color: '#22c55e', marginTop: '8px' }}>
                ● Backend Connected ({API_URL})
              </p>
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div>
            <h1>Analyze Call</h1>
            <div className="card">
              <form onSubmit={handleFileUpload}>
                <div className="upload-box">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={(e) => setFile(e.target.files[0])} 
                  />
                  {file && <p style={{ marginTop: '10px', color: '#38bdf8' }}>Selected: {file.name}</p>}
                </div>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Analyzing..." : "Start Analysis"}
                </button>
              </form>

              {/* Clean Result Cards - No Raw JSON */}
              {result && (
                <div style={{ marginTop: '28px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
                  <h3 style={{ color: '#38bdf8', marginBottom: '16px' }}>Analysis Results</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ margin: 0, padding: '16px' }}>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>File Name</p>
                      <p style={{ fontWeight: '600', marginTop: '4px' }}>{result.file_name || 'N/A'}</p>
                    </div>

                    <div className="card" style={{ margin: 0, padding: '16px' }}>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Duration</p>
                      <p style={{ fontWeight: '600', marginTop: '4px' }}>{result.duration || 'N/A'}</p>
                    </div>

                    <div className="card" style={{ margin: 0, padding: '16px' }}>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sentiment</p>
                      <p style={{ fontWeight: '600', marginTop: '4px', color: '#22c55e' }}>{result.sentiment || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Summary</p>
                    <p style={{ marginTop: '6px', color: '#f8fafc' }}>{result.summary || 'No summary available'}</p>
                  </div>

                  <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Transcription</p>
                    <p style={{ marginTop: '6px', color: '#f8fafc' }}>{result.transcription || 'No transcription generated'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
