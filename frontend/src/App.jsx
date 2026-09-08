import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an audio file first!");

    setLoading(true);
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
      {/* Sidebar */}
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

      {/* Main Area */}
      <div className="main-content">
        {activeTab === 'dashboard' && (
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>Welcome to Voice Call Threat & AI Detector</p>
            <div className="card">
              <h3>System Status</h3>
              <p style={{ color: '#22c55e', marginTop: '8px' }}>● Backend Connected ({API_URL})</p>
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
                  {file && <p style={{ marginTop: '10px' }}>Selected: {file.name}</p>}
                </div>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Analyzing..." : "Start Analysis"}
                </button>
              </form>

              {result && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
                  <h3>Results:</h3>
                  <pre style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
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
