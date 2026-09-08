from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import tempfile
import urllib.request
import zipfile
import librosa
import numpy as np

# ==========================================
# AUTO-DOWNLOAD & UNZIP MODEL WEIGHTS ON RENDER
# ==========================================
weights_dir = "weights"
weights_path = os.path.join(weights_dir, "AASIST-L.pth")
zip_path = os.path.join(weights_dir, "AASIST-L.zip")

if not os.path.exists(weights_path):
    os.makedirs(weights_dir, exist_ok=True)
    print("🔄 Downloading AASIST-L zip from GitHub Release...")
    
    # GitHub Release wala direct zip link
    model_url = "https://github.com/user-attachments/files/31959888/AASIST-L.zip"
    
    try:
        urllib.request.urlretrieve(model_url, zip_path)
        print("📦 Extracting model weights...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(weights_dir)
        
        # Zip file ko delete kar do taaki storage bache
        if os.path.exists(zip_path):
            os.remove(zip_path)
        print("✅ Model weights ready and extracted successfully!")
    except Exception as e:
        print(f"❌ Failed to download/extract model: {e}")

# ==========================================
# IMPORTS & APP SETUP
# ==========================================
from audio_pipeline import create_windows, resample_audio
from aasist_detector import AASISTDetector
from transcription import transcription_provider
from risk_engine import (
    detect_indicators,
    calculate_context_risk,
    calculate_action_risk,
    calculate_final_risk,
)

app = FastAPI(title="VoiceShield Backend")

# CORS middleware configured with Vercel frontend domain to prevent CORS blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://voiceshield-iota.vercel.app",  # <--- Vercel Frontend URL allowed explicitly
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load AASIST-L detector once at startup
detector = AASISTDetector()


async def load_and_process_audio(file: UploadFile):
    """
    Safely saves uploaded audio to a temp file and loads it via librosa.
    This bypasses libsndfile stream bugs and handles .mp3, .webm, .wav, etc. seamlessly.
    Automatically handles resampling to 16000Hz and converting to mono.
    """
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    if not file_extension:
        file_extension = ".wav"

    # Save uploaded bytes to a secure temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_audio:
        shutil.copyfileobj(file.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        # Load using librosa (handles multi-format decoding, mono mixing, and resampling natively)
        audio, sample_rate = librosa.load(
            temp_audio_path, 
            sr=AASISTDetector.SAMPLE_RATE, 
            mono=True
        )
        original_sr_approx = 16000
        return audio, sample_rate, original_sr_approx
    except Exception as e:
        raise ValueError(f"Failed to decode audio file: {str(e)}")
    finally:
        # Clean up temporary file to prevent disk/memory bloat on Render
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception:
                pass


@app.get("/")
def home():
    return {
        "project": "VoiceShield Backend",
        "status": "Backend is running",
        "detector": "AASIST-L",
        "risk_engine": "connected",
        "transcription": type(transcription_provider).__name__,
    }


@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """
    Voice-spoof detection only endpoint with robust file handling.
    """
    audio_data_bytes = await file.read()
    file.file.seek(0) # Reset pointer for safe reading inside helper

    audio, sample_rate, original_sample_rate = await load_and_process_audio(file)
    duration = len(audio) / sample_rate

    detection = detector.analyze(audio)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(audio_data_bytes),
        "original_sample_rate": original_sample_rate,
        "analyzed_sample_rate": sample_rate,
        "duration_seconds": round(duration, 2),
        "voice_detection": detection,
        "status": "Audio analyzed successfully",
    }


@app.post("/analyze-call")
async def analyze_call(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
):
    """
    Full enterprise pipeline: Voice Spoof Detection + Auto-Transcription (Whisper) 
    + Context/Action Risk Fusion with robust cross-format support.
    """
    # Load and process audio safely using temp file + librosa
    audio, sample_rate, original_sample_rate = await load_and_process_audio(file)
    duration = len(audio) / sample_rate

    # --- 1. Voice Channel Analysis (AASIST-L) ---
    detection = detector.analyze(audio)
    voice_risk = detection["average_spoof_probability"]
    reliability = detection["reliability"]

    # --- 2. Context Channel (Automatic Speech-to-Text via Whisper) ---
    if not transcript:
        transcript = transcription_provider.transcribe(audio, sample_rate)

    indicators = detect_indicators(transcript) if transcript else []
    context_risk = calculate_context_risk(indicators) if transcript else 0.0
    action_risk = calculate_action_risk(indicators)

    # --- 3. Multi-Layer Risk Fusion ---
    final_risk = calculate_final_risk(
        voice_risk=voice_risk,
        context_risk=context_risk,
        action_risk=action_risk,
        reliability=reliability,
    )

    return {
        "filename": file.filename,
        "original_sample_rate": original_sample_rate,
        "analyzed_sample_rate": sample_rate,
        "duration_seconds": round(duration, 2),
        "voice_detection": detection,
        "transcript_used": transcript,
        "detected_indicators": indicators,
        "context_risk": round(context_risk, 3),
        "action_risk": round(action_risk, 3),
        "final_risk_assessment": final_risk,
    }
