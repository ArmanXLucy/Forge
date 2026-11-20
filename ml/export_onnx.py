"""
export_onnx.py
==============
Export the trained per-exercise Random Forests to ONNX for onnxruntime-web,
together with every artefact needed to guarantee the browser reproduces the
training-time feature pipeline exactly.

    /content/fitness/models/rf_<exercise>.joblib
      -> /content/fitness/export/form_classifier_<exercise>.onnx
      -> /content/fitness/export/model_metadata.json
      -> /content/fitness/export/metrics.json
"""

from __future__ import annotations

import json
import os
import sys

import joblib
import numpy as np
import onnxruntime as ort
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

ROOT = "/content/fitness"
MODELS = os.path.join(ROOT, "models")
EXPORT = os.path.join(ROOT, "export")
os.makedirs(EXPORT, exist_ok=True)

EXERCISES = ["squat", "bicep_curl", "push_up"]
VERSION = "1.0.0"
OP_SET = 15  # wide browser support in onnxruntime-web


def export_one(ex: str) -> dict:
    bundle = joblib.load(os.path.join(MODELS, f"rf_{ex}.joblib"))
    pipe = bundle["pipeline"]
    cols = bundle["feature_cols"]
    thr = bundle["threshold"]

    onx = convert_sklearn(
        pipe,
        initial_types=[("input", FloatTensorType([None, len(cols)]))],
        target_opset=OP_SET,
        options={id(pipe): {"zipmap": False}},
    )
    path = os.path.join(EXPORT, f"form_classifier_{ex}.onnx")
    with open(path, "wb") as fh:
        fh.write(onx.SerializeToString())

    # Parity check: sklearn vs onnxruntime on random plausible inputs.
    rng = np.random.RandomState(0)
    X = rng.normal(0, 1, size=(64, len(cols))).astype(np.float32)
    sk_proba = pipe.predict_proba(X)[:, 1]
    sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    out_names = [o.name for o in sess.get_outputs()]
    onx_out = sess.run(out_names, {"input": X})
    prob_idx = out_names.index("probabilities") if "probabilities" in out_names else 1
    onx_proba = np.asarray(onx_out[prob_idx])[:, 1]
    max_abs_diff = float(np.max(np.abs(sk_proba - onx_proba)))
    print(f"[{ex}] exported {os.path.getsize(path)/1e3:.1f} kB, "
          f"max |sklearn-onnx| = {max_abs_diff:.6f}", flush=True)
    assert max_abs_diff < 1e-4, "ONNX export does not match sklearn output"

    return {
        "exercise": ex,
        "onnx_file": os.path.basename(path),
        "input_shape": [1, len(cols)],
        "feature_cols": cols,
        "threshold": thr,
        "class_order": ["BAD", "GOOD"],
        "opset": OP_SET,
        "parity_max_abs_diff": max_abs_diff,
    }


def main():
    entries = {}
    for ex in EXERCISES:
        entries[ex] = export_one(ex)

    metrics = {}
    mpath = os.path.join(MODELS, "metrics.json")
    if os.path.exists(mpath):
        metrics = json.load(open(mpath))

    # First model defines the canonical feature order for the browser client.
    any_ex = next(iter(entries.values()))
    metadata = {
        "version": VERSION,
        "created_by": "ml/export_onnx.py",
        "purpose": "GOOD/BAD exercise form classification from MediaPipe Pose landmarks",
        "pose": {
            "landmarks": 33,
            "model": "pose_landmarker_full.task",
            "coordinate_space": "normalized image coords (x,y in [0,1], z relative)",
        },
        "feature_pipeline": {
            "window_sec": 2.0,
            "window_stride_sec": 0.5,
            "sampling_fps": 10,
            "aggregation": "mean,std,min,max,range,first,last,absdiff_mean per frame feature",
            "frame_features": "see ml/fitness_features.py (compute_frame_features)",
            "imputation": "median (baked into the ONNX pipeline)",
        },
        "feature_order": any_ex["feature_cols"],
        "models": entries,
        "notes": [
            "Input must be a float32 tensor of shape [N, len(feature_order)].",
            "Output 'probabilities' columns follow class_order: [BAD, GOOD].",
            "Compare prob_good against threshold, not against 0.5.",
            "Feature extraction in JS must replicate ml/fitness_features.py exactly.",
        ],
    }
    with open(os.path.join(EXPORT, "model_metadata.json"), "w") as fh:
        json.dump(metadata, fh, indent=2)
    with open(os.path.join(EXPORT, "metrics.json"), "w") as fh:
        json.dump(metrics, fh, indent=2)

    print("export complete:", sorted(os.listdir(EXPORT)), flush=True)


if __name__ == "__main__":
    main()
