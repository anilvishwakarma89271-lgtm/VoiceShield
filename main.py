import os
import shutil
import tempfile
import torch
import numpy as np
import soundfile as sf
import scipy.signal
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="Audio Call Analyzer API", version="1.0.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Root Route: Screen par JSON ke jagah Clean HTML Status UI dikhega
@app.get("/", response_class=HTMLResponse)
def read_root():
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Call Analyzer API Status</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #0f172a;
                color: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background: #1e293b;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                border: 1px solid #334155;
                width: 350px;
                text-align: center;
            }}
            .badge {{
                background: #10b981;
                color: #064e3b;
                font-weight: bold;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                display: inline-block;
                margin-bottom: 1rem;
            }}
            h1 {{ font-size: 1.5rem; margin-bottom: 1.5rem; color: #38bdf8; }}
            .info-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #334155;
                font-size: 0.95rem;
            }}
            .info-row:last-child {{ border-bottom: none; }}
            .label {{ color: #94a3b8; }}
            .val {{ font-weight: 600; color: #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">● ONLINE</span>
            <h1>Call Analyzer API</h1>
            <div class="info-row">
                <span class="label">Device:</span>
                <span class="val">{DEVICE.upper()}</span>
            </div>
            <div class="info-row">
                <span class="label">PyTorch:</span>
                <span class="val">{torch.__version__}</span>
            </div>
            <div class="info-row">
                <span class="label">Status:</span>
                <span class="val" style="color:#10b981;">Ready to Process</span>
            </div>
        </div>
    </body>
    </html>
    """


@app.post("/analyze")
async def analyze_call(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        data, sample_rate = sf.read(temp_file_path)
        
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)

        duration_seconds = float(len(data) / sample_rate)
        rms_energy = float(np.sqrt(np.mean(data**2)))

        audio_tensor = torch.from_numpy(data).float().to(DEVICE)
        peak_val = float(torch.max(torch.abs(audio_tensor)).cpu().item())

        analysis_result = {
            "file_name": file.filename,
            "sample_rate": sample_rate,
            "duration": f"{duration_seconds:.2f} seconds",
            "channels": 1,
            "device_used": DEVICE,
            "signal_metrics": {
                "rms_energy": round(rms_energy, 4),
                "peak_amplitude": round(peak_val, 4)
            },
            "sentiment": "Positive" if rms_energy > 0.01 else "Neutral",
            "summary": f"Audio file successfully processed. Total length is {duration_seconds:.1f} seconds.",
            "transcription": "Sample transcription based on PyTorch processing pipeline."
        }

        return analysis_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}")

    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
