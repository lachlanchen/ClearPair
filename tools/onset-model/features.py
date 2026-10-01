"""ClearPair onset log-mel features, mirrored by src/onset-features.ts.

Feature design adapted from the user's sibling L-And-N/tools/onset-model/features.py.
No L-And-N weights or datasets are imported. This self-contained NumPy transform
is shared by ClearPair's own dataset builder/trainer and cross-runtime parity tests.
Input is mono PCM already resampled to 16 kHz; do not replace antialiased resampling
with linear interpolation. Only final mean-normalised features are cast to float32.
"""
from __future__ import annotations

import numpy as np

FEATURE_VERSION = "htk-logmel-16k-300ms-40:v1"
GLOBAL_FEATURE_VERSION = "htk-logmel-16k-300ms-40-global:v2"
SAMPLE_RATE = 16_000
WINDOW_SAMPLES = 4_800
LEAD_SAMPLES = 640
JITTER_MAX = 800
FRAME_SIZE = 400
HOP_SIZE = 160
FFT_SIZE = 512
MEL_BANDS = 40
MEL_MAX_HZ = 8_000.0
LOG_FLOOR = 1e-5
N_FRAMES = (WINDOW_SAMPLES - FRAME_SIZE) // HOP_SIZE + 1


def hz_to_mel(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel: float) -> float:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def mel_filterbank() -> np.ndarray:
    points = np.array([mel_to_hz(m) for m in np.linspace(0.0, hz_to_mel(MEL_MAX_HZ), MEL_BANDS + 2)])
    bin_hz = np.arange(FFT_SIZE // 2 + 1) * SAMPLE_RATE / FFT_SIZE
    bank = np.zeros((MEL_BANDS, bin_hz.size), dtype=np.float64)
    for band in range(MEL_BANDS):
        lower, centre, upper = points[band : band + 3]
        rising = (bin_hz - lower) / max(centre - lower, 1e-9)
        falling = (upper - bin_hz) / max(upper - centre, 1e-9)
        bank[band] = np.maximum(0.0, np.minimum(rising, falling))
    return bank


_BANK = mel_filterbank()
_WINDOW = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(FRAME_SIZE) / FRAME_SIZE)


def _audio(samples: np.ndarray) -> np.ndarray:
    value = np.asarray(samples, dtype=np.float64)
    if value.ndim != 1 or not np.isfinite(value).all():
        raise ValueError("Onset PCM must be a finite mono vector")
    return value


def log_mel(samples: np.ndarray, normalization: str = "band") -> np.ndarray:
    """Return [28, 40], using unchanged band-centred v1 unless global v2 is explicit.

    Global centring removes one log-energy offset and preserves the relative
    average spectrum. This requires separately trained weights, not v1 weights.
    """
    if normalization not in ("band", "global"):
        raise ValueError("Unsupported onset normalization")
    clip = _audio(samples)[:WINDOW_SAMPLES]
    audio = np.zeros(WINDOW_SAMPLES, dtype=np.float64)
    audio[:clip.size] = clip
    frames = np.stack([audio[start:start + FRAME_SIZE] * _WINDOW
                       for start in range(0, WINDOW_SAMPLES - FRAME_SIZE + 1, HOP_SIZE)])
    spectrum = np.fft.rfft(frames, n=FFT_SIZE, axis=1)
    power = spectrum.real**2 + spectrum.imag**2
    mel = np.log(power @ _BANK.T + LOG_FLOOR)
    if not np.isfinite(mel).all():
        raise ValueError("Onset spectral energy overflow")
    if normalization == "global":
        return (mel - mel.mean()).astype(np.float32)
    return (mel - mel.mean(axis=0, keepdims=True)).astype(np.float32)


def token_window(audio: np.ndarray, onset_sample: int) -> np.ndarray:
    """At 16 kHz, retain the 40 ms pre-onset lead, padding beyond recording edges."""
    audio = _audio(audio)
    if isinstance(onset_sample, (bool, np.bool_)) or not isinstance(onset_sample, (int, np.integer)) or not 0 <= onset_sample <= audio.size:
        raise ValueError("Invalid onset sample")
    start = int(onset_sample) - LEAD_SAMPLES
    window = np.zeros(WINDOW_SAMPLES, dtype=np.float32)
    source_start, source_end = max(0, start), min(audio.size, start + WINDOW_SAMPLES)
    if source_end > source_start:
        window[source_start - start:source_end - start] = audio[source_start:source_end]
    if not np.isfinite(window).all():
        raise ValueError("Onset PCM exceeds float32 range")
    return window
