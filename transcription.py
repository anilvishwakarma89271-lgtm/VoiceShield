"""
Transcript source for the risk_engine's context/action-risk indicators.
Integrated with OpenAI Whisper for automated speech-to-text conversion.
"""

from __future__ import annotations
import numpy as np
import torch
import warnings

class TranscriptionProvider:
    def transcribe(self, audio: np.ndarray, sample_rate: int) -> str:
        raise NotImplementedError


class WhisperTranscriptionProvider(TranscriptionProvider):
    """Production-grade Whisper STT provider for local offline transcription."""

    def __init__(self, model_size: str = "base"):
        import whisper
        # Automatically detect device (GPU if available, else CPU)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        warnings.filterwarnings("ignore", category=UserWarning)
        
        # Load whisper model into memory once during startup
        self.model = whisper.load_model(model_size, device=self.device)

    def transcribe(self, audio: np.ndarray, sample_rate: int) -> str:
        try:
            # Whisper expects float32 numpy array normalized between -1.0 and 1.0
            audio = np.asarray(audio, dtype=np.float32)
            
            # If sample rate isn't 16kHz, Whisper's internal feature extractor expects 16k,
            # but assuming audio is already resampled to 16kHz by main.py pipeline.
            result = self.model.transcribe(audio, fp16=(self.device == "cuda"))
            return result.get("text", "").strip()
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""


class NullTranscriptionProvider(TranscriptionProvider):
    """Fallback fallback provider if whisper isn't required."""

    def transcribe(self, audio: np.ndarray, sample_rate: int) -> str:
        return ""


# Active transcription provider initialized for production use
try:
    transcription_provider: TranscriptionProvider = WhisperTranscriptionProvider(model_size="base")
except Exception as e:
    print(f"Warning: Could not load Whisper model ({e}). Falling back to NullTranscriptionProvider.")
    transcription_provider: TranscriptionProvider = NullTranscriptionProvider()
