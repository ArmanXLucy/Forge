"""
Extract MediaPipe Pose Landmarker landmarks (33 landmarks) from every video in
/content/fitness/raw and save one Parquet file per video.

Layout expected:
    /content/fitness/raw/<exercise>/<quality>/<view>/subject_XXX_<exercise>_<quality>_<view>.mp4

Output:
    /content/fitness/landmarks/<exercise>/<quality>/<view>/subject_XXX_....parquet
    columns: frame_idx, t_sec, sampled, detected, lm{0..32}_{x,y,z,v}

Sampling: TARGET_FPS (default 10) from native 15 fps.
Frames where no pose is found are KEPT as rows with detected=False and NaN
landmark values, so pose-detection failure rates are measurable.
"""

import json
import logging
import os
import sys
import time

# Quiet the LiteRT / XNNPACK C++ chatter before mediapipe is imported.
os.environ.setdefault("GLOG_minloglevel", "2")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("ABSL_MIN_LOG_LEVEL", "2")

import cv2
import numpy as np
import pandas as pd

import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

logging.getLogger("mediapipe").setLevel(logging.ERROR)

ROOT = "/content/fitness"
MODEL = os.path.join(ROOT, "models", "pose_landmarker_full.task")
RAW = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "landmarks")
PROGRESS = os.path.join(ROOT, "extract_progress.json")

TARGET_FPS = 10.0
CONF = 0.3

COLS = [f"lm{k}_{c}" for k in range(33) for c in ("x", "y", "z", "v")]

def make_landmarker():
    """A fresh landmarker per video: the VIDEO-mode tracker keeps state and
    requires strictly increasing timestamps, so each clip starts a new stream."""
    opts = vision.PoseLandmarkerOptions(
        base_options=mpp.BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=CONF,
        min_pose_presence_confidence=CONF,
        min_tracking_confidence=CONF,
        output_segmentation_masks=False,
    )
    return vision.PoseLandmarker.create_from_options(opts)


def process_one(path):
    rel = os.path.relpath(path, RAW)
    out_path = os.path.join(OUT, rel[:-4] + ".parquet")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return {"path": path, "out": out_path, "skipped": True}

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    lm = make_landmarker()

    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
    if fps <= 1 or fps > 120:
        fps = 15.0
    step = max(1.0, fps / TARGET_FPS)

    idx = -1
    k = 0
    next_idx = 0
    rows = []
    n_detected = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        idx += 1
        if idx < next_idx:
            continue
        k += 1
        next_idx = int(round(k * step))

        ts = int(1000.0 * idx / fps)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = lm.detect_for_video(img, ts)

        if res.pose_landmarks:
            lms = res.pose_landmarks[0]
            flat = []
            for p in lms:
                flat.extend((p.x, p.y, p.z, getattr(p, "visibility", 0.0)))
            rows.append([idx, idx / fps, 1, 1] + flat)
            n_detected += 1
        else:
            rows.append([idx, idx / fps, 1, 0] + [np.nan] * 132)

    cap.release()
    lm.close()

    df = pd.DataFrame(rows, columns=["frame_idx", "t_sec", "sampled", "detected"] + COLS)
    df["frame_idx"] = df["frame_idx"].astype("int32")
    df["sampled"] = df["sampled"].astype("int8")
    df["detected"] = df["detected"].astype("int8")
    for c in ["t_sec"] + COLS:
        df[c] = df[c].astype("float32")
    df.to_parquet(out_path, index=False)

    return {
        "path": path,
        "out": out_path,
        "frames_sampled": len(df),
        "frames_detected": int(n_detected),
        "detection_rate": (n_detected / len(df)) if len(df) else 0.0,
        "fps_native": fps,
        "skipped": False,
    }


def worker(path):
    """Single-video task, so progress is reported as soon as each clip finishes."""
    try:
        return process_one(path)
    except Exception as exc:  # keep going, record the failure
        return {"path": path, "error": f"{type(exc).__name__}: {exc}"}


def main():
    os.makedirs(OUT, exist_ok=True)
    paths = []
    for dirpath, _dirs, files in os.walk(RAW):
        for f in files:
            if f.lower().endswith(".mp4"):
                paths.append(os.path.join(dirpath, f))
    paths.sort()
    total = len(paths)
    print(f"videos to process: {total}", flush=True)

    n_workers = int(os.environ.get("WORKERS", "2"))
    pending = [p for p in paths if not (
        os.path.exists(os.path.join(OUT, os.path.relpath(p, RAW)[:-4] + ".parquet"))
    )]
    print(f"already done: {total - len(pending)}, remaining: {len(pending)}", flush=True)

    import multiprocessing as mp2

    results = []
    t0 = time.time()
    done = 0
    with mp2.Pool(n_workers) as pool:
        for res in pool.imap_unordered(worker, pending, chunksize=1):
            results.append(res)
            done += 1
            elapsed = time.time() - t0
            rate = done / elapsed if elapsed else 0
            eta = (len(pending) - done) / rate if rate else 0
            name = os.path.basename(res.get("path", "?"))
            rate_txt = f"{res.get('detection_rate', 0):.2f}" if "detection_rate" in res else "ERR"
            print(
                f"[{done}/{len(pending)}] {name} det={rate_txt} "
                f"{rate*60:.1f} vid/min eta {eta/60:.1f} min",
                flush=True,
            )
            with open(PROGRESS, "w") as fh:
                json.dump({"done": total - len(pending) + done, "total": total,
                           "elapsed": round(elapsed, 1)}, fh)

    ok = [r for r in results if not r.get("error")]
    err = [r for r in results if r.get("error")]
    frames = sum(r.get("frames_sampled", 0) for r in ok)
    detected = sum(r.get("frames_detected", 0) for r in ok)

    # Merge with the per-video stats of any earlier partial run.
    prev_path = os.path.join(ROOT, "extract_summary.json")
    prev_per_video = []
    if os.path.exists(prev_path):
        try:
            prev_per_video = json.load(open(prev_path)).get("per_video", [])
        except Exception:
            prev_per_video = []
    new_per_video = [{k: v for k, v in r.items() if k != "out"} for r in ok if not r.get("skipped")]
    merged = {p["path"]: p for p in prev_per_video}
    merged.update({p["path"]: p for p in new_per_video})
    all_per_video = list(merged.values())
    frames_all = sum(p.get("frames_sampled", 0) for p in all_per_video)
    detected_all = sum(p.get("frames_detected", 0) for p in all_per_video)

    summary = {
        "videos": total,
        "videos_ok": len(ok),
        "videos_failed": len(err),
        "frames_sampled": frames,
        "frames_detected": detected,
        "overall_detection_rate": (detected / frames) if frames else 0.0,
        "all_videos": len(all_per_video),
        "frames_sampled_all": frames_all,
        "frames_detected_all": detected_all,
        "overall_detection_rate_all": (detected_all / frames_all) if frames_all else 0.0,
        "elapsed_sec": round(time.time() - t0, 1),
        "errors": [{"path": e["path"], "error": e["error"]} for e in err],
        "per_video": all_per_video,
    }
    with open(os.path.join(ROOT, "extract_summary.json"), "w") as fh:
        json.dump(summary, fh, indent=2)

    print("\n===== SUMMARY =====", flush=True)
    print(f"videos ok/failed: {len(ok)}/{len(err)}", flush=True)
    print(f"frames sampled: {frames}, detected: {detected}", flush=True)
    print(f"overall detection rate this run: {summary['overall_detection_rate']:.4f}", flush=True)
    print(f"all clips on disk: {summary['all_videos']}, detection rate "
          f"{summary['overall_detection_rate_all']:.4f}", flush=True)
    print(f"elapsed: {summary['elapsed_sec']}s", flush=True)
    if err:
        print("failures:", err[:5], flush=True)


if __name__ == "__main__":
    main()
