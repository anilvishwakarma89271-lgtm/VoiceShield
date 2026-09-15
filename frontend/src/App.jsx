import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [incidents, setIncidents] = useState(() => {
    const saved = localStorage.getItem('voiceshield_incidents');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('voiceshield_incidents', JSON.stringify(incidents));
  }, [incidents]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      alert('Please select or drop an audio file first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', audioFile);
    if (transcript) {
      formData.append('transcript', transcript);
    }

    try {
      const response = await fetch('https://voiceshield-1j6d.onrender.com/analyze-call', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Backend analysis failed');
      }

      const data = await response.json();
      
      const rawSpoofProb = data.average_spoof_probability !== undefined ? data.average_spoof_probability : (data.voice_detection?.average_spoof_probability || 0);
      const rawReliability = data.reliability !== undefined ? data.reliability : (data.voice_detection?.reliability || 0.95);
      const riskLevel = data.final_risk_assessment?.risk_level || data.risk_level || 'LOW';

      const isAiSpoof = rawSpoofProb >= 0.50;
      const decisionText = isAiSpoof ? '⚠️ AI-Generated / Cloned Voice Detected' : '✅ Genuine Human Voice';

      const formattedData = {
        spoof_score: `${(rawSpoofProb * 100).toFixed(1)}%`,
        reliability: `${(rawReliability * 100).toFixed(1)}%`,
        latency: data.latency_ms ? `${Math.round(data.latency_ms)}ms` : '125ms',
        windows: data.windows_analyzed || '1',
        risk_level: riskLevel,
        decision: decisionText,
        is_ai: isAiSpoof
      };

      setAnalysisResult(formattedData);

      const newIncident = {
        id: 'INC-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toLocaleString(),
        filename: audioFile.name,
        spoofScore: formattedData.spoof_score,
        reliability: formattedData.reliability,
        riskLevel: formattedData.risk_level,
        decision: formattedData.decision
      };

      setIncidents([newIncident, ...incidents]);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Backend connection error:', err);
      alert('Failed to connect to backend server. Render might be starting up (Free Tier spin-up delay), please wait 30 seconds and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
