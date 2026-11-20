"""
experiment_clip.py
==================
Clip-level, domain-knowledge features + subject-grouped cross-validation.

Why this instead of 291 window statistics
-----------------------------------------
The windowed model reached AUC 0.998 on training participants and 0.72 / 0.54 /
0.75 on held-out ones. With 25 participants, 291 correlated columns and ~22k
highly overlapping windows, a tree ensemble memorises the people. The product
also scores a *set*, not a 2 s slice, so the honest unit is one clip.

Here every clip becomes ONE sample built from a small set of quantities a coach
would actually name (range of motion, torso lean, knee tracking, sway, depth),
and evaluation is 5-fold GroupKFold on participants.

Run:  python experiment_clip.py
Output: dataset/clip_features.parquet, dataset/clip_cv_results.csv
"""

from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = "/content/fitness"
DS = os.path.join(ROOT, "dataset")


def clip_features(g: pd.DataFrame) -> dict:
    """Domain features for one clip. All are scale-free (angles, ratios, ROM)."""
    f: dict[str, float] = {}

    def stat(col: str, name: str, fn) -> None:
        v = g[col].to_numpy(dtype=float)
        v = v[np.isfinite(v)]
        f[name] = float(fn(v)) if len(v) else np.nan

    # Joint ranges of motion - the core of "full rep" vs "partial rep".
    for col, key in [("knee_angle_mean", "knee"), ("hip_angle_mean", "hip"),
                     ("elbow_angle_mean", "elbow"), ("shoulder_angle_mean", "shoulder"),
                     ("ankle_angle_mean" if "ankle_angle_mean" in g else "ankle_angle_l", "ankle")]:
        if col not in g:
            continue
        stat(col, f"{key}_min", np.min)
        stat(col, f"{key}_max", np.max)
        stat(col, f"{key}_rom", lambda v: np.max(v) - np.min(v))
        stat(col, f"{key}_std", np.std)
        stat(col, f"{key}_iqr", lambda v: np.percentile(v, 75) - np.percentile(v, 25))

    # Torso behaviour: lean magnitude and uncontrolled sway.
    stat("torso_inclination", "torso_mean", np.mean)
    stat("torso_inclination", "torso_max", np.max)
    stat("torso_inclination", "torso_std", np.std)
    stat("torso_inclination", "torso_rom", lambda v: np.max(v) - np.min(v))
    stat("shoulder_to_hip_x", "sway_std", np.std)
    stat("shoulder_to_hip_x", "sway_maxabs", lambda v: float(np.max(np.abs(v))))
    stat("shoulder_to_hip_x", "sway_range", lambda v: float(np.max(v) - np.min(v)))

    # Knee tracking (valgus proxy) and stance.
    stat("knee_bend_abs_mean", "knee_dev_mean", np.mean)
    stat("knee_bend_abs_mean", "knee_dev_max", np.max)
    stat("knee_bend_abs_diff", "knee_dev_asym_mean", np.mean)
    stat("knee_width_ratio", "knee_width_min", np.min)
    stat("knee_width_ratio", "knee_width_max", np.max)
    stat("ankle_width_ratio", "ankle_width_mean", np.mean)

    # Depth / body line.
    stat("hip_height_norm", "hip_drop_range", lambda v: float(np.max(v) - np.min(v)))
    stat("hip_height_norm", "hip_drop_min", np.min)
    stat("shoulder_height_norm", "shoulder_drop_range", lambda v: float(np.max(v) - np.min(v)))

    # Left/right symmetry.
    stat("knee_angle_diff", "knee_lr_diff_mean", np.mean)
    stat("elbow_angle_diff", "elbow_lr_diff_mean", np.mean)

    # Wrist travel (curl/push-up): how far the hands actually move.
    stat("wrist_height_l", "wrist_l_range", lambda v: float(np.max(v) - np.min(v)))
    stat("wrist_height_r", "wrist_r_range", lambda v: float(np.max(v) - np.min(v)))
    stat("wrist_height_l", "wrist_l_max", np.max)
    stat("wrist_height_r", "wrist_r_max", np.max)

    # Tempo-independent movement smoothness.
    stat("knee_angle_mean", "knee_vel_absmean", lambda v: float(np.abs(np.diff(v)).mean()) if len(v) > 1 else 0.0)
    stat("elbow_angle_mean", "elbow_vel_absmean", lambda v: float(np.abs(np.diff(v)).mean()) if len(v) > 1 else 0.0)

    return f


def build() -> pd.DataFrame:
    frames = pd.read_parquet(os.path.join(DS, "frames.parquet"))
    meta_cols = ["video_id", "exercise", "quality", "view", "subject", "label"]
    rows = []
    for vid, g in frames.groupby("video_id", sort=False):
        rec = {c: g[c].iloc[0] for c in meta_cols}
        rec["n_frames"] = int(len(g))
        rec.update(clip_features(g))
        rows.append(rec)
    df = pd.DataFrame(rows)
    df.to_parquet(os.path.join(DS, "clip_features.parquet"), index=False)
    print("clips:", len(df), "features:", df.shape[1] - len(meta_cols) - 1, flush=True)
    return df


def models() -> dict:
    return {
        "logreg_c0.1": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("sc", StandardScaler()),
            ("clf", LogisticRegression(C=0.1, max_iter=5000, class_weight="balanced")),
        ]),
        "rf_d3": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(n_estimators=400, max_depth=3, min_samples_leaf=8,
                                           max_features=0.5, class_weight="balanced",
                                           random_state=42, n_jobs=2)),
        ]),
        "rf_d6": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(n_estimators=400, max_depth=6, min_samples_leaf=3,
                                           max_features=0.5, class_weight="balanced",
                                           random_state=42, n_jobs=2)),
        ]),
    }


def best_f1(y: np.ndarray, p: np.ndarray) -> tuple[float, float, float]:
    """Best F1 over thresholds, plus the false-accept rate at that threshold."""
    best = (-1.0, 0.5, 1.0)
    for thr in np.arange(0.2, 0.81, 0.02):
        pred = (p >= thr).astype(int)
        f = f1_score(y, pred, zero_division=0)
        tn = int(((y == 0) & (pred == 0)).sum())
        fp = int(((y == 0) & (pred == 1)).sum())
        far = fp / (fp + tn) if (fp + tn) else 1.0
        if f > best[0]:
            best = (f, float(thr), far)
    return best


def main() -> None:
    if os.path.exists(os.path.join(DS, "clip_features.parquet")):
        df = pd.read_parquet(os.path.join(DS, "clip_features.parquet"))
        print("loaded existing clip_features.parquet", flush=True)
    else:
        df = build()

    meta_cols = ["video_id", "exercise", "quality", "view", "subject", "label", "n_frames"]
    feat_cols = [c for c in df.columns if c not in meta_cols and not c.startswith("view_")]
    print("feature cols:", len(feat_cols), flush=True)

    gkf = GroupKFold(n_splits=5)
    rows = []
    for ex in ["squat", "bicep_curl", "push_up"]:
        d = df[df["exercise"] == ex].reset_index(drop=True)
        y = d["label"].to_numpy()
        groups = d["subject"].to_numpy()
        for mname, proto in models().items():
            oof = np.zeros(len(d))
            for tr, te in gkf.split(d, y, groups):
                m = clone(proto)
                m.fit(d.iloc[tr][feat_cols].to_numpy(np.float32), y[tr])
                oof[te] = m.predict_proba(d.iloc[te][feat_cols].to_numpy(np.float32))[:, 1]
            auc = roc_auc_score(y, oof)
            f1, thr, far = best_f1(y, oof)
            acc = float(((oof >= thr).astype(int) == y).mean())
            rows.append(dict(exercise=ex, model=mname, n=len(d), auc=round(auc, 3),
                             f1=round(f1, 3), acc=round(acc, 3), thr=thr,
                             false_accept=round(far, 3)))
            print(f"{ex:11s} {mname:12s} n={len(d):3d} auc={auc:.3f} f1={f1:.3f} "
                  f"acc={acc:.3f} thr={thr:.2f} far={far:.2f}", flush=True)

        # Which single features separate good from bad for this exercise?
        d2 = d.copy()
        d2["p"] = oof
        print(f"  mean elbow_rom good={d2[d2.label==1].elbow_rom.mean():.1f} "
              f"bad={d2[d2.label==0].elbow_rom.mean():.1f} | "
              f"torso_max good={d2[d2.label==1].torso_max.mean():.1f} "
              f"bad={d2[d2.label==0].torso_max.mean():.1f} | "
              f"knee_rom good={d2[d2.label==1].knee_rom.mean():.1f} "
              f"bad={d2[d2.label==0].knee_rom.mean():.1f}", flush=True)

    res = pd.DataFrame(rows).sort_values(["exercise", "auc"], ascending=[True, False])
    res.to_csv(os.path.join(DS, "clip_cv_results.csv"), index=False)
    print("\n===== RESULT (5-fold GroupKFold on participants) =====", flush=True)
    print(res.to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
