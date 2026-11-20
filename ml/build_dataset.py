"""
build_dataset.py
================
Turns the extracted landmark Parquet files into a windowed, subject-split
feature dataset ready for training.

    /content/fitness/landmarks/<exercise>/<quality>/<view>/*.parquet
      -> /content/fitness/dataset/windows.parquet   (one row per 2s window)
      -> /content/fitness/dataset/splits.json       (subject -> split)
      -> /content/fitness/dataset/summary.json

Leakage rules enforced here
---------------------------
* Splits are made on SUBJECT, never on video or window.
* Filenames, subject ids and exercise names are never used as features.
* The good/bad label is used only as the target.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, "/content/fitness")
import fitness_features as ff  # noqa: E402

ROOT = "/content/fitness"
LMS = os.path.join(ROOT, "landmarks")
OUT = os.path.join(ROOT, "dataset")
os.makedirs(OUT, exist_ok=True)

EXERCISES = ["squat", "bicep_curl", "push_up"]
WINDOW_SEC = 2.0
STRIDE_SEC = 0.5
MIN_DETECTED_RATIO = 0.6


def parse_path(path: str) -> dict:
    rel = os.path.relpath(path, LMS)
    parts = rel.split(os.sep)
    exercise, quality, view = parts[0], parts[1], parts[2]
    fname = parts[3] if len(parts) > 3 else os.path.basename(parts[2])
    stem = os.path.basename(fname)[:-8] if fname.endswith(".parquet") else fname
    subject = [p for p in stem.split("_") if p.startswith("subject")]
    sid = stem.split("_")[1] if "_" in stem else "000"
    return dict(
        video_id=stem,
        exercise=exercise,
        quality=quality,
        view=view,
        subject=sid,
        path=path,
    )


def build() -> None:
    files = []
    for dirpath, _dirs, names in os.walk(LMS):
        for n in names:
            if n.endswith(".parquet"):
                files.append(os.path.join(dirpath, n))
    files.sort()
    print(f"landmark files: {len(files)}", flush=True)

    all_rows = []
    all_meta = []
    all_frames = []
    per_video = []
    feature_names = None

    for i, path in enumerate(files, 1):
        info = parse_path(path)
        if info["exercise"] not in EXERCISES:
            continue
        raw = pd.read_parquet(path)
        n_total = len(raw)
        raw = raw[raw["detected"] == 1].reset_index(drop=True)
        det_ratio = len(raw) / n_total if n_total else 0.0
        if len(raw) < 8:
            per_video.append({**{k: v for k, v in info.items() if k != "path"},
                              "windows": 0, "detected_ratio": det_ratio, "skipped": True})
            continue

        feats = ff.compute_frame_features(raw)
        feats["video_id"] = info["video_id"]
        feats["exercise"] = info["exercise"]
        feats["quality"] = info["quality"]
        feats["view"] = info["view"]
        feats["subject"] = info["subject"]
        feats["label"] = 1 if info["quality"] == "good" else 0
        all_frames.append(feats)

        X, names, meta = ff.make_windows(
            feats, window_sec=WINDOW_SEC, stride_sec=STRIDE_SEC,
            min_detected_ratio=MIN_DETECTED_RATIO,
        )
        if feature_names is None:
            feature_names = names
        per_video.append({**{k: v for k, v in info.items() if k != "path"},
                          "windows": len(X), "detected_ratio": round(det_ratio, 4),
                          "skipped": False})
        if len(X) == 0:
            continue

        all_rows.append(X)
        for m in meta:
            all_meta.append({
                "video_id": info["video_id"],
                "exercise": info["exercise"],
                "quality": info["quality"],
                "view": info["view"],
                "subject": info["subject"],
                "label": 1 if info["quality"] == "good" else 0,
                "win_start": m["start"],
                "win_end": m["end"],
                "win_detected_ratio": round(m["detected_ratio"], 4),
            })
        if i % 50 == 0:
            print(f"  processed {i}/{len(files)} files, windows so far {sum(len(r) for r in all_rows)}",
                  flush=True)

    X_all = np.vstack(all_rows)
    meta_df = pd.DataFrame(all_meta)
    feat_df = pd.DataFrame(X_all, columns=feature_names)
    df = pd.concat([meta_df.reset_index(drop=True), feat_df.reset_index(drop=True)], axis=1)

    # One-hot the camera view: the app knows which camera angle the user chose.
    for v in ["front", "side", "diagonal"]:
        df[f"view_{v}"] = (df["view"] == v).astype(np.int8)

    df.to_parquet(os.path.join(OUT, "windows.parquet"), index=False)

    # Per-frame features: needed for the temporal models and rep-count evaluation.
    frames_df = pd.concat(all_frames, ignore_index=True)
    frames_df.to_parquet(os.path.join(OUT, "frames.parquet"), index=False)
    print(f"frames.parquet rows: {len(frames_df)}", flush=True)
    with open(os.path.join(OUT, "feature_names.json"), "w") as fh:
        json.dump(feature_names + ["view_front", "view_side", "view_diagonal"], fh, indent=1)

    per_video_df = pd.DataFrame(per_video)
    per_video_df.to_csv(os.path.join(OUT, "per_video.csv"), index=False)

    summary = {
        "windows": int(len(df)),
        "frames": int(len(frames_df)),
        "videos": int(len(per_video_df)),
        "videos_with_windows": int((per_video_df["windows"] > 0).sum()),
        "features": len(feature_names) + 3,
        "window_sec": WINDOW_SEC,
        "stride_sec": STRIDE_SEC,
        "per_exercise": {
            ex: {
                "windows": int((df["exercise"] == ex).sum()),
                "good": int(((df["exercise"] == ex) & (df["label"] == 1)).sum()),
                "bad": int(((df["exercise"] == ex) & (df["label"] == 0)).sum()),
                "subjects": int(df.loc[df["exercise"] == ex, "subject"].nunique()),
            }
            for ex in EXERCISES
        },
        "pose_detection_rate_mean": float(per_video_df["detected_ratio"].mean()),
        "pose_detection_rate_min": float(per_video_df["detected_ratio"].min()),
    }
    with open(os.path.join(OUT, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2)
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    build()
