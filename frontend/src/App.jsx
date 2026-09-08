{result && (
  <div className="results-container" style={{ marginTop: '24px' }}>
    <h3 style={{ color: '#38bdf8', marginBottom: '16px' }}>Analysis Summary</h3>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <div className="card" style={{ padding: '16px' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>File Name</p>
        <p style={{ fontWeight: '600', marginTop: '4px' }}>{result.file_name}</p>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Duration</p>
        <p style={{ fontWeight: '600', marginTop: '4px' }}>{result.duration}</p>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sentiment</p>
        <p style={{ fontWeight: '600', marginTop: '4px', color: '#22c55e' }}>{result.sentiment}</p>
      </div>
    </div>

    <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Transcription</p>
      <p style={{ marginTop: '6px' }}>{result.transcription}</p>
    </div>
  </div>
)}
