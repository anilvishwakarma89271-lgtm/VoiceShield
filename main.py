import os
import shutil
import tempfile
import torch
import numpy as np
import soundfile as sf
import scipy.signal
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Audio Call Analyzer API", version="1.0.0")

# 1. CORS Setup (Taaki Vercel/Netlify/Localhar jagah se frontend connect ho sake)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Call Analyzer API",
        "device": DEVICE,
        "torch_version": torch.__version__
    }


@app.post("/analyze")
async def analyze_call(file: UploadFile = File(...)):
    # 2. File Format Check
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_file_path = None
    try:
        # 3. Temporary Audio Storage
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # 4. Sound Processing via soundfile & numpy
        data, sample_rate = sf.read(temp_file_path)
        
        # Mono channel conversion
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)

        duration_seconds = float(len(data) / sample_rate)
        rms_energy = float(np.sqrt(np.mean(data**2)))

        # PyTorch Tensor Processing
        audio_tensor = torch.from_numpy(data).float().to(DEVICE)
        peak_val = float(torch.max(torch.abs(audio_tensor)).cpu().item())

        # Response Payload
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
            "transcription": "Sample transcription generated from processed audio signal."
        }

        return analysis_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}")

    finally:
        # 5. Cleanup Temp File
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


if __name__ == "__main__":
    import uvicorn
    # Dynamic Render Port Binding
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
