"""
fitness_features.py
===================
Shared feature engineering for the AI Fitness Coach form classifier.

Everything here is pure NumPy/Pandas so the exact same maths can be re-implemented
in TypeScript for the browser (MediaPipe Pose Landmarker -> these features ->
ONNX Random Forest).

Coordinate convention (MediaPipe Pose, 33 landmarks):
    x : 0 (left of image) -> 1 (right of image)
    y : 0 (top) -> 1 (bottom)
    z : depth, roughly "distance in front of the hips", smaller = closer
    visibility: 0..1 confidence that the joint is visible

IMPORTANT
---------
* Angles are computed in the image plane (x, y) only. MediaPipe's z is far
  noisier than x/y, and the single-camera views in our dataset are close to
  orthographic. 3D angles are available but flagged experimental.
* All positions are normalised by the hip centre and the torso length so the
  features are invariant to how far the person stands from the camera and to
  image resolution.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Landmark indices
# --------------------------------------------------------------------------
LM = {
    "nose": 0,
    "left_eye_inner": 1,
    "left_eye": 2,
    "left_eye_outer": 3,
    "right_eye_inner": 4,
    "right_eye": 5,
    "right_eye_outer": 6,
    "left_ear": 7,
    "right_ear": 8,
    "mouth_left": 9,
    "mouth_right": 10,
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_pinky": 17,
    "right_pinky": 18,
    "left_index": 19,
    "right_index": 20,
    "left_thumb": 21,
    "right_thumb": 22,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
    "left_heel": 29,
    "right_heel": 30,
    "left_foot_index": 31,
    "right_foot_index": 32,
}

N_LANDMARKS = 33
LANDMARK_COLS = [f"lm{k}_{c}" for k in range(N_LANDMARKS) for c in ("x", "y", "z", "v")]

# Columns produced by extract_pose.py
META_COLS = ["frame_idx", "t_sec", "sampled", "detected"]


def landmarks_array(df: pd.DataFrame) -> np.ndarray:
    """(T, 33, 4) float array of x, y, z, visibility."""
    return df[LANDMARK_COLS].to_numpy(dtype=np.float32).reshape(-1, N_LANDMARKS, 4)


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------
def _vec(p: np.ndarray, a: int, b: int) -> np.ndarray:
    """Vector a -> b, shape (T, 2)."""
    return p[:, b, :2] - p[:, a, :2]


def joint_angle(p: np.ndarray, a: int, b: int, c: int) -> np.ndarray:
    """Angle at joint ``b`` between the segments b->a and b->c, in degrees (0-180).

    A straight limb gives ~180 deg, a fully bent limb gives a small angle.
    """
    v1 = _vec(p, b, a)
    v2 = _vec(p, b, c)
    n1 = np.linalg.norm(v1, axis=1)
    n2 = np.linalg.norm(v2, axis=1)
    denom = np.clip(n1 * n2, 1e-6, None)
    cos = np.clip((v1 * v2).sum(axis=1) / denom, -1.0, 1.0)
    return np.degrees(np.arccos(cos))


def segment_inclination(p: np.ndarray, a: int, b: int, axis: str = "y") -> np.ndarray:
    """Angle of segment a->b versus the vertical (image y) axis, in degrees.

    0 deg = perfectly vertical, 90 deg = horizontal.
    """
    v = _vec(p, a, b)
    if axis == "y":
        ref = np.stack([np.zeros(len(v)), np.ones(len(v))], axis=1)
    else:
        ref = np.stack([np.ones(len(v)), np.zeros(len(v))], axis=1)
    vn = np.linalg.norm(v, axis=1)
    dot = np.abs((v * ref).sum(axis=1)) / np.clip(vn, 1e-6, None)
    return np.degrees(np.arccos(np.clip(dot, -1.0, 1.0)))


def signed_bend(p: np.ndarray, a: int, b: int, c: int) -> np.ndarray:
    """Signed deviation of the a-b-c chain from straight, in degrees.

    Positive = the joint bows to one side of the b->c line, negative = the other.
    Used for frontal-plane knee valgus (knee caving in vs. pushing out).
    """
    v1 = _vec(p, b, a)
    v2 = _vec(p, b, c)
    cross = v1[:, 0] * v2[:, 1] - v1[:, 1] * v2[:, 0]
    ang = joint_angle(p, a, b, c)
    # 0 when straight; grows with deviation, sign from the cross product
    return np.sign(cross) * (180.0 - ang)


def normalised_positions(p: np.ndarray) -> np.ndarray:
    """Landmark x,y translated to the hip centre and scaled by torso length.

    Returns (T, 33*2). Torso length = |shoulder_centre - hip_centre|, which is
    far more stable than shoulder width for a single camera.
    """
    hip_c = (p[:, LM["left_hip"], :2] + p[:, LM["right_hip"], :2]) / 2.0
    sho_c = (p[:, LM["left_shoulder"], :2] + p[:, LM["right_shoulder"], :2]) / 2.0
    scale = np.linalg.norm(sho_c - hip_c, axis=1)
    scale = np.where(scale < 1e-3, np.nan, scale)
    rel = (p[:, :, :2] - hip_c[:, None, :]) / scale[:, None, None]
    return rel.reshape(len(p), -1), scale


# --------------------------------------------------------------------------
# Per-frame features
# --------------------------------------------------------------------------
FRAME_FEATURE_COLS = [
    "knee_angle_l",
    "knee_angle_r",
    "knee_angle_mean",
    "knee_angle_diff",
    "hip_angle_l",
    "hip_angle_r",
    "hip_angle_mean",
    "hip_angle_diff",
    "elbow_angle_l",
    "elbow_angle_r",
    "elbow_angle_mean",
    "elbow_angle_diff",
    "shoulder_angle_l",
    "shoulder_angle_r",
    "shoulder_angle_mean",
    "ankle_angle_l",
    "ankle_angle_r",
    "torso_inclination",
    "hip_inclination",
    "shoulder_inclination",
    "knee_signed_bend_l",
    "knee_signed_bend_r",
    "knee_bend_abs_mean",
    "knee_bend_abs_diff",
    "knee_width_ratio",
    "ankle_width_ratio",
    "shoulder_width_ratio",
    "hip_height_norm",
    "shoulder_height_norm",
    "wrist_height_l",
    "wrist_height_r",
    "shoulder_to_hip_x",
    "vis_min_legs",
    "vis_min_arms",
    "vis_min_torso",
    "body_scale",
]


def compute_frame_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw landmark rows into one row of biomechanical features per frame.

    Frames where pose detection failed are dropped (they are counted separately
    by the caller, so failure rates stay reportable).
    """
    p = landmarks_array(df)
    t = df["t_sec"].to_numpy(dtype=np.float32)
    frame_idx = df["frame_idx"].to_numpy()

    vis = p[:, :, 3]
    out = pd.DataFrame(index=np.arange(len(df)))
    out["frame_idx"] = frame_idx
    out["t_sec"] = t

    # --- lower body -------------------------------------------------------
    out["knee_angle_l"] = joint_angle(p, LM["left_hip"], LM["left_knee"], LM["left_ankle"])
    out["knee_angle_r"] = joint_angle(p, LM["right_hip"], LM["right_knee"], LM["right_ankle"])
    out["knee_angle_mean"] = (out["knee_angle_l"] + out["knee_angle_r"]) / 2.0
    out["knee_angle_diff"] = (out["knee_angle_l"] - out["knee_angle_r"]).abs()

    out["hip_angle_l"] = joint_angle(p, LM["left_shoulder"], LM["left_hip"], LM["left_knee"])
    out["hip_angle_r"] = joint_angle(p, LM["right_shoulder"], LM["right_hip"], LM["right_knee"])
    out["hip_angle_mean"] = (out["hip_angle_l"] + out["hip_angle_r"]) / 2.0
    out["hip_angle_diff"] = (out["hip_angle_l"] - out["hip_angle_r"]).abs()

    out["ankle_angle_l"] = joint_angle(p, LM["left_knee"], LM["left_ankle"], LM["left_foot_index"])
    out["ankle_angle_r"] = joint_angle(p, LM["right_knee"], LM["right_ankle"], LM["right_foot_index"])

    # --- upper body -------------------------------------------------------
    out["elbow_angle_l"] = joint_angle(p, LM["left_shoulder"], LM["left_elbow"], LM["left_wrist"])
    out["elbow_angle_r"] = joint_angle(p, LM["right_shoulder"], LM["right_elbow"], LM["right_wrist"])
    out["elbow_angle_mean"] = (out["elbow_angle_l"] + out["elbow_angle_r"]) / 2.0
    out["elbow_angle_diff"] = (out["elbow_angle_l"] - out["elbow_angle_r"]).abs()

    out["shoulder_angle_l"] = joint_angle(p, LM["left_elbow"], LM["left_shoulder"], LM["left_hip"])
    out["shoulder_angle_r"] = joint_angle(p, LM["right_elbow"], LM["right_shoulder"], LM["right_hip"])
    out["shoulder_angle_mean"] = (out["shoulder_angle_l"] + out["shoulder_angle_r"]) / 2.0

    # --- torso / alignment ------------------------------------------------
    hip_c = (p[:, LM["left_hip"], :2] + p[:, LM["right_hip"], :2]) / 2.0
    sho_c = (p[:, LM["left_shoulder"], :2] + p[:, LM["right_shoulder"], :2]) / 2.0
    torso = sho_c - hip_c
    torso_len = np.linalg.norm(torso, axis=1)
    torso_len = np.where(torso_len < 1e-3, np.nan, torso_len)
    # 0 deg = torso upright (shoulders above hips), 90 deg = horizontal
    out["torso_inclination"] = np.degrees(
        np.arccos(np.clip(np.abs(torso[:, 1]) / torso_len, -1.0, 1.0))
    )
    out["shoulder_to_hip_x"] = (sho_c[:, 0] - hip_c[:, 0]) / torso_len

    out["hip_inclination"] = segment_inclination(p, LM["left_hip"], LM["right_hip"], "x")
    out["shoulder_inclination"] = segment_inclination(p, LM["left_shoulder"], LM["right_shoulder"], "x")

    # Frontal-plane knee behaviour (knee valgus / varus proxy).
    out["knee_signed_bend_l"] = signed_bend(p, LM["left_hip"], LM["left_knee"], LM["left_ankle"])
    out["knee_signed_bend_r"] = signed_bend(p, LM["right_hip"], LM["right_knee"], LM["right_ankle"])
    out["knee_bend_abs_mean"] = (
        out["knee_signed_bend_l"].abs() + out["knee_signed_bend_r"].abs()
    ) / 2.0
    out["knee_bend_abs_diff"] = (
        out["knee_signed_bend_l"].abs() - out["knee_signed_bend_r"].abs()
    ).abs()

    # Width ratios (front view: knees collapsing inwards / stance width).
    def width(a: int, b: int) -> np.ndarray:
        return (p[:, a, 0] - p[:, b, 0]).__abs__() / torso_len

    out["knee_width_ratio"] = width(LM["left_knee"], LM["right_knee"])
    out["ankle_width_ratio"] = width(LM["left_ankle"], LM["right_ankle"])
    out["shoulder_width_ratio"] = width(LM["left_shoulder"], LM["right_shoulder"])

    # Vertical position of the body relative to the ankles: a squat drops the hips.
    ankle_y = (p[:, LM["left_ankle"], 1] + p[:, LM["right_ankle"], 1]) / 2.0
    out["hip_height_norm"] = (ankle_y - hip_c[:, 1]) / torso_len
    out["shoulder_height_norm"] = (ankle_y - sho_c[:, 1]) / torso_len

    # Wrist height relative to the shoulders: a curl brings hands up.
    sho_y = (p[:, LM["left_shoulder"], 1] + p[:, LM["right_shoulder"], 1]) / 2.0
    out["wrist_height_l"] = (sho_y - p[:, LM["left_wrist"], 1]) / torso_len
    out["wrist_height_r"] = (sho_y - p[:, LM["right_wrist"], 1]) / torso_len

    # --- visibility -------------------------------------------------------
    legs = [LM["left_knee"], LM["right_knee"], LM["left_ankle"], LM["right_ankle"]]
    arms = [LM["left_elbow"], LM["right_elbow"], LM["left_wrist"], LM["right_wrist"]]
    torso_ids = [LM["left_shoulder"], LM["right_shoulder"], LM["left_hip"], LM["right_hip"]]
    out["vis_min_legs"] = vis[:, legs].min(axis=1)
    out["vis_min_arms"] = vis[:, arms].min(axis=1)
    out["vis_min_torso"] = vis[:, torso_ids].min(axis=1)
    out["body_scale"] = torso_len

    return out[["frame_idx", "t_sec"] + FRAME_FEATURE_COLS]


# --------------------------------------------------------------------------
# Window aggregation (what the classifier actually consumes)
# --------------------------------------------------------------------------
#: Columns that get the full statistical treatment inside a window.
AGG_COLS = FRAME_FEATURE_COLS

#: Columns that only get min/max/mean (redundant stats avoided).
LIGHT_COLS = ["vis_min_legs", "vis_min_arms", "vis_min_torso", "body_scale"]

STATS = ("mean", "std", "min", "max", "range", "first", "last", "absdiff_mean")


def window_feature_names(cols=AGG_COLS, stats=STATS) -> list[str]:
    names = []
    for c in cols:
        for s in stats:
            names.append(f"{c}__{s}")
    return names


def _stat_block(block: np.ndarray, prefix: str, t: np.ndarray, stats=STATS) -> list[float]:
    """block: (window_len, n_cols)."""
    vals: list[float] = []
    dt = np.median(np.diff(t)) if len(t) > 1 else 0.1
    dt = dt if dt and dt > 1e-3 else 0.1
    for j in range(block.shape[1]):
        col = block[:, j]
        finite = np.isfinite(col)
        if finite.sum() == 0:
            vals.extend([np.nan] * len(stats))
            continue
        c = col[finite]
        for s in stats:
            if s == "mean":
                vals.append(float(np.mean(c)))
            elif s == "std":
                vals.append(float(np.std(c)))
            elif s == "min":
                vals.append(float(np.min(c)))
            elif s == "max":
                vals.append(float(np.max(c)))
            elif s == "range":
                vals.append(float(np.max(c) - np.min(c)))
            elif s == "first":
                vals.append(float(c[0]))
            elif s == "last":
                vals.append(float(c[-1]))
            elif s == "absdiff_mean":
                if len(c) > 1:
                    vals.append(float(np.mean(np.abs(np.diff(col[finite]))) / dt))
                else:
                    vals.append(0.0)
    return vals


def make_windows(
    frame_feats: pd.DataFrame,
    window_sec: float = 2.0,
    stride_sec: float = 0.5,
    min_detected_ratio: float = 0.6,
) -> tuple[np.ndarray, list[str], list[dict]]:
    """Slice one video's per-frame features into overlapping windows.

    Windows are cut on time, not frame counts, so videos with different
    sampling are handled consistently.

    Returns (X, feature_names, meta) where meta has start/end time and the
    fraction of frames that had a detected pose.
    """
    df = frame_feats.dropna(subset=["t_sec"]).reset_index(drop=True)
    names = window_feature_names(AGG_COLS)
    if len(df) == 0:
        return np.zeros((0, len(names)), dtype=np.float32), names, []

    t_all = df["t_sec"].to_numpy()
    end_t = float(t_all[-1])
    rows, meta = [], []
    start = 0.0
    while start + window_sec <= end_t + 1e-6:
        mask = (t_all >= start) & (t_all < start + window_sec)
        block = df.loc[mask, AGG_COLS].to_numpy(dtype=np.float64)
        # Re-index to a dense grid so windows with dropped frames stay comparable.
        if len(block) >= max(4, int(window_sec * 4)):
            ok_ratio = np.isfinite(block[:, AGG_COLS.index("knee_angle_mean")]).mean()
            if ok_ratio >= min_detected_ratio:
                rows.append(_stat_block(block, "", t_all[mask]))
                meta.append(
                    {
                        "start": round(start, 3),
                        "end": round(start + window_sec, 3),
                        "n_frames": int(len(block)),
                        "detected_ratio": float(ok_ratio),
                    }
                )
        start += stride_sec

    X = np.asarray(rows, dtype=np.float32) if rows else np.zeros((0, len(names)), np.float32)
    return X, names, meta
