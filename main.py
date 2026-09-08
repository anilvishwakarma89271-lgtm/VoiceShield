from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import soundfile as sf
import io

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

# CORS middleware for frontend integration (Vite / React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load AASIST-L detector once at startup
detector = AASISTDetector()


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
    Voice-spoof detection only endpoint.
    """
    audio_data = await file.read()
    audio, sample_rate = sf.read(io.BytesIO(audio_data))

    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)

    duration = len(audio) / sample_rate

    original_sample_rate = sample_rate
    audio = resample_audio(audio, sample_rate, AASISTDetector.SAMPLE_RATE)
    sample_rate = AASISTDetector.SAMPLE_RATE

    detection = detector.analyze(audio)

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(audio_data),
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
    + Context/Action Risk Fusion.
    """
    audio_data = await file.read()
    audio, sample_rate = sf.read(io.BytesIO(audio_data))

    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)

    duration = len(audio) / sample_rate

    original_sample_rate = sample_rate
    audio = resample_audio(audio, sample_rate, AASISTDetector.SAMPLE_RATE)
    sample_rate = AASISTDetector.SAMPLE_RATE

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
