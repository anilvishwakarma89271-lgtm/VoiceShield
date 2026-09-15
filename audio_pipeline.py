import numpy as np
from scipy.signal import resample
import noisereduce as nr

def clean_audio_noise(audio, sample_rate):
    """
    Remove background noise and harsh artifacts from audio 
    before passing it to the AASIST-L detector.
    """
    audio_np = np.asarray(audio, dtype=np.float32)
    # Apply spectral gating noise reduction
    reduced_noise = nr.reduce_noise(y=audio_np, sr=sample_rate, prop_decrease=0.8)
    return reduced_noise.astype(np.float32)

def create_windows(audio, sample_rate, window_seconds=1):
    window_size = sample_rate * window_seconds
    windows = []
    for start in range(0, len(audio), window_size):
        end = start + window_size
        if end <= len(audio):
            windows.append(audio[start:end])
    return windows

def resample_audio(audio, orig_sample_rate, target_sample_rate):
    """
    Resample audio to target_sample_rate if it doesn't already match.
    """
    if orig_sample_rate == target_sample_rate:
        return clean_audio_noise(audio, target_sample_rate)

    n_target_samples = int(round(len(audio) * target_sample_rate / orig_sample_rate))
    resampled = resample(audio, n_target_samples)
    
    # Clean noise after resampling to 16kHz
    cleaned_audio = clean_audio_noise(resampled, target_sample_rate)
    return cleaned_audio
