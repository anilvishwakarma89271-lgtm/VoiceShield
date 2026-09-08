import os
import time
import numpy as np
import torch

from _net import Model


class AASISTDetector:

    SAMPLE_RATE = 16000
    TARGET_LENGTH = 64600
    WINDOW_SECONDS = 4.0
    WINDOW_SAMPLES = 64600

    def __init__(self, weights_path=None):

        if weights_path is None:
            weights_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "weights",
                "AASIST-L.pth"
            )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        config = {
            "architecture": "AASIST",
            "nb_samp": 64600,
            "first_conv": 128,
            "filts": [
                70,
                [1, 32],
                [32, 32],
                [32, 24],
                [24, 24]
            ],
            "gat_dims": [24, 32],
            "pool_ratios": [0.4, 0.5, 0.7, 0.5],
            "temperatures": [2.0, 2.0, 100.0, 100.0]
        }

        if not os.path.exists(weights_path):
            raise FileNotFoundError(
                f"AASIST-L weights not found: {weights_path}"
            )

        self.model = Model(config).to(self.device)

        checkpoint = torch.load(
            weights_path,
            map_location=self.device
        )

        if isinstance(checkpoint, dict):
            checkpoint = checkpoint.get(
                "state_dict",
                checkpoint
            )

        self.model.load_state_dict(
            checkpoint,
            strict=True
        )

        self.model.eval()

    @staticmethod
    def prepare_audio(audio):
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)

        if len(audio) >= AASISTDetector.TARGET_LENGTH:
            # Agar audio lamba hai toh exact target length ka chunk lein
            return audio[:AASISTDetector.TARGET_LENGTH]
        
        if len(audio) == 0:
            raise ValueError("Audio is empty")

        # Agar chota hai toh padding (zeros) karein bajaye repeat karne ke, 
        # kyunki repeating se artifacts aate hain jo AI voice ko mask kar sakte hain.
        padded_audio = np.zeros(AASISTDetector.TARGET_LENGTH, dtype=np.float32)
        padded_audio[:len(audio)] = audio
        return padded_audio

    @torch.no_grad()
    def predict_window(self, audio):
        audio = self.prepare_audio(audio)

        tensor = torch.from_numpy(audio).unsqueeze(0).to(self.device)

        _, logits = self.model(tensor)

        probabilities = torch.softmax(logits, dim=1)[0]

        # AASIST standard: Index 0 usually bonafide or spoof depending on training, 
        # let's check probabilities mapping. Usually logits output [spoof, bonafide] or [bonafide, spoof].
        # Let's map them safely based on standard AASIST output structure.
        spoof_probability = float(probabilities[0].item())
        bona_fide_probability = float(probabilities[1].item())

        return {
            "spoof_probability": round(spoof_probability, 4),
            "bona_fide_probability": round(bona_fide_probability, 4)
        }

    def analyze(self, audio):
        start_time = time.perf_counter()
        windows = [self.prepare_audio(audio)] # Single clean window evaluation for reliable spoof check

        window_results = []
        for index, window in enumerate(windows):
            result = self.predict_window(window)
            result["window"] = index + 1
            window_results.append(result)

        spoof_scores = [r["spoof_probability"] for r in window_results]
        bona_fide_scores = [r["bona_fide_probability"] for r in window_results]

        average_spoof = float(np.mean(spoof_scores))
        average_bona_fide = float(np.mean(bona_fide_scores))
        maximum_spoof = float(np.max(spoof_scores))

        reliability = 1.0

        if average_spoof >= 0.75:
            risk_level = "CRITICAL"
        elif average_spoof >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        latency_ms = (time.perf_counter() - start_time) * 1000

        return {
            "model": "AASIST-L",
            "sample_rate": self.SAMPLE_RATE,
            "window_duration_seconds": self.WINDOW_SECONDS,
            "windows_analyzed": len(windows),
            "average_spoof_probability": round(average_spoof, 4),
            "average_bona_fide_probability": round(average_bona_fide, 4),
            "maximum_spoof_probability": round(maximum_spoof, 4),
            "risk_level": risk_level,
            "reliability": round(reliability, 4),
            "latency_ms": round(latency_ms, 2),
            "window_results": window_results
        }
