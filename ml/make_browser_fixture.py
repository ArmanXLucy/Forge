"""
make_browser_fixture.py
=======================
Builds the self-test fixture for the browser demo.

The browser has to reproduce the training features exactly, or the ONNX model
receives garbage. To prove it does, this script:

1. synthesises MediaPipe-shaped landmark frames for each exercise
   (a 30 s set at 10 fps with a realistic joint-angle oscillation),
2. runs them through the SAME python code that produced the training data
   (fitness_features.compute_frame_features -> experiment_clip.clip_features
    -> experiment_repmetry.rep_features),
3. runs the exported ONNX model on the resulting feature vector,
4. writes landmarks + expected features + expected probability to
   public/model-check-fixture.json.

The demo page recomputes those features in JavaScript and compares them to
`expected`, so any drift between the Python trainer and the browser extractor
is caught before the model is trusted.

Run:  python ml/make_browser_fixture.py
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import fitness_features as ff  # noqa: E402
import experiment_clip as ec  # noqa: E402
import experiment_repmetry as er  # noqa: E402

MODELS = os.path.join(PROJECT, "public", "models")
OUT = os.path.join(PROJECT, "public", "model-check-fixture.json")

FPS = 10.0
SECONDS = 30.0


def base_skeleton() -> np.ndarray:
    """A standing figure facing the camera, in normalised image coordinates."""
    p = np.zeros((33, 4), dtype=np.float32)
    p[:, 3] = 0.98  # visibility
    pts = {
        0: (0.50, 0.10),    # nose
        11: (0.44, 0.22),   # left shoulder
        12: (0.56, 0.22),   # right shoulder
        13: (0.43, 0.34),   # left elbow
        14: (0.57, 0.34),   # right elbow
        15: (0.42, 0.45),   # left wrist
        16: (0.58, 0.45),   # right wrist
        23: (0.46, 0.50),   # left hip
        24: (0.54, 0.50),   # right hip
        25: (0.46, 0.68),   # left knee
        26: (0.54, 0.68),   # right knee
        27: (0.46, 0.86),   # left ankle
        28: (0.54, 0.86),   # right ankle
        29: (0.46, 0.90),   # left heel
        30: (0.54, 0.90),   # right heel
        31: (0.47, 0.92),   # left foot index
        32: (0.55, 0.92),   # right foot index
    }
    for i, (x, y) in pts.items():
        p[i, 0], p[i, 1] = x, y
    return p


def synth_frames(exercise: str, seed: int = 7) -> tuple[np.ndarray, np.ndarray]:
    """Landmark frames where the *primary* joint angle follows a rep waveform.

    squat / push_up  -> knee / elbow angle between 90 and 170 degrees
    bicep_curl       -> elbow angle between 70 and 165 degrees
    """
    rng = np.random.RandomState(seed)
    n = int(FPS * SECONDS)
    t = np.arange(n) / FPS

    if exercise == "squat":
        mid, amp, period = 130.0, 40.0, 2.5
    elif exercise == "bicep_curl":
        mid, amp, period = 117.0, 47.0, 2.2
    else:  # push_up
        mid, amp, period = 130.0, 40.0, 2.8

    target = mid + amp * np.sin(2 * np.pi * t / period)

    frames = np.zeros((n, 33, 4), dtype=np.float32)
    for i in range(n):
        p = base_skeleton()
        theta = np.deg2rad(max(5.0, min(178.0, target[i])))

        if exercise == "squat":
            knee = p[25, :2]
            L = 0.18
            phi = np.pi - theta          # 0 = ankle straight below knee
            ankle = knee + L * np.array([np.sin(phi), np.cos(phi)])
            p[27, :2] = p[28, :2] = ankle
            p[29, :2] = p[30, :2] = ankle + np.array([0.0, 0.03])
            p[31, :2] = p[32, :2] = ankle + np.array([0.01, 0.05])
            drop = 0.14 * (170.0 - target[i]) / 80.0
            p[23, :2] = p[24, :2] = p[23, :2] + np.array([0.0, drop])
            p[11, :2] = p[12, :2] = p[11, :2] + np.array([0.0, drop * 0.9])
            p[13, :2] = p[14, :2] = p[13, :2] + np.array([0.0, drop * 0.9])
            p[15, :2] = p[16, :2] = p[15, :2] + np.array([0.0, drop * 0.9])

        elif exercise == "bicep_curl":
            elbow = p[13, :2]
            L = 0.13
            phi = np.pi - theta
            wrench = elbow + L * np.array([np.sin(phi) * 0.35, np.cos(phi)])
            p[15, :2] = wrench
            p[16, :2] = wrench + np.array([0.10, 0.0])
            sway = 0.012 * np.sin(2 * np.pi * t[i] / period)
            p[23:25, 0] += sway
            p[11:13, 0] += sway * 1.6

        else:  # push_up
            elbow = p[13, :2]
            L = 0.12
            phi = np.pi - theta
            wrist = elbow + L * np.array([np.sin(phi), np.cos(phi)])
            p[15, :2] = p[16, :2] = wrist
            drop = 0.10 * (170.0 - target[i]) / 80.0
            p[23, :2] = p[24, :2] = p[23, :2] + np.array([0.0, drop])
            p[11, :2] = p[12, :2] = p[11, :2] + np.array([0.0, drop * 1.2])

        p[:, :2] += rng.normal(0, 0.0015, size=(33, 2)).astype(np.float32)
        frames[i] = p

    return frames, t


def frames_to_raw_df(frames: np.ndarray, t: np.ndarray) -> pd.DataFrame:
    rows = []
    for i in range(len(frames)):
        row = {"frame_idx": i, "t_sec": t[i], "sampled": 1, "detected": 1}
        for k in range(33):
            row[f"lm{k}_x"] = frames[i, k, 0]
            row[f"lm{k}_y"] = frames[i, k, 1]
            row[f"lm{k}_z"] = frames[i, k, 2]
            row[f"lm{k}_v"] = frames[i, k, 3]
        rows.append(row)
    return pd.DataFrame(rows)


def expected_features(exercise: str, frames: np.ndarray, t: np.ndarray, cols: list[str]) -> dict:
    # Compute in float64 from the exact values the browser will receive, so the
    # comparison isolates porting bugs from float32-vs-float64 noise.
    frames = frames.astype(np.float64)
    raw = frames_to_raw_df(frames, t)
    feats = ff.compute_frame_features(raw)
    clip = ec.clip_features(feats)
    rep = er.rep_features(feats, er.PRIMARY_ANGLE[exercise])
    combined = {**clip, **rep}
    return {c: (None if not np.isfinite(combined.get(c, np.nan)) else float(combined[c]))
            for c in cols}


def main() -> None:
    meta = json.load(open(os.path.join(MODELS, "model_metadata.json")))
    cols = meta["feature_order"]

    import onnxruntime as ort

    fixtures = {}
    for ex in ["squat", "bicep_curl", "push_up"]:
        frames, t = synth_frames(ex)
        exp = expected_features(ex, frames, t, cols)
        vec = np.array([[np.nan if exp[c] is None else exp[c] for c in cols]], dtype=np.float32)

        sess = ort.InferenceSession(os.path.join(MODELS, f"form_classifier_{ex}.onnx"),
                                    providers=["CPUExecutionProvider"])
        names = [o.name for o in sess.get_outputs()]
        p_good = float(np.asarray(sess.run(None, {"input": vec})[names.index("probabilities")])[0, 1])

        fixtures[ex] = {
            "threshold": meta["thresholds"][ex],
            "landmarks": frames.tolist(),
            "t": np.round(t, 4).tolist(),
            "expected": exp,
            "expected_p_good": round(p_good, 6),
        }
        n_rep = exp.get("rep_rate_per_sec")
        print(f"{ex:11s} synthetic clips OK  expected p(GOOD)={p_good:.4f}  "
              f"rep_rate={n_rep:.3f}/s  angle_range={exp['angle_range_clip']:.1f} deg",
              flush=True)

    with open(OUT, "w") as fh:
        json.dump({"feature_order": cols, "fps": FPS, "fixtures": fixtures}, fh)
    print(f"\nwrote {OUT}  ({os.path.getsize(OUT)/1e6:.2f} MB)")


if __name__ == "__main__":
    main()
