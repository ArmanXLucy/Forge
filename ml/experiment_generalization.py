"""
experiment_generalization.py
============================
Honest diagnosis of what actually generalises across participants.

Problem the baseline exposed: RandomForest reaches AUC 0.998 on training
windows but only 0.72 / 0.54 / 0.75 (squat / curl / push-up) on unseen
participants. That gap is subject memorisation, not form understanding.

This script answers, with 5-fold GroupKFold on subjects:

1. Are the scale-dependent / visibility columns acting as recording-ID leaks?
2. Does stronger regularisation fix it?
3. Does a linear model generalise better than a tree ensemble here?
4. Which feature family carries the signal (angles, ratios, view one-hots)?

Run:  python experiment_generalization.py
"""

from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = "/content/fitness"
DS = os.path.join(ROOT, "dataset")

# Columns that encode *how the clip was recorded* rather than how the body moved.
SESSION_LEAK_COLS = ("body_scale", "vis_min_", "view_")
# Everything that is a pure pose/angle measurement.
POSE_PREFIXES = ("knee_", "hip_", "elbow_", "shoulder_", "ankle_", "torso_", "wrist_",
                 "knee_bend", "shoulder_to_hip_x", "shoulder_height_norm", "hip_height_norm")


def feature_sets(cols: list[str]) -> dict[str, list[str]]:
    pose_only = [c for c in cols if c.startswith(POSE_PREFIXES)]
    no_session = [c for c in cols if not c.startswith(SESSION_LEAK_COLS)]
    angles = [c for c in cols if c.startswith(("knee_angle", "hip_angle", "elbow_angle",
                                               "shoulder_angle", "ankle_angle", "torso_inclination"))]
    return {
        "all_291": cols,
        "no_session_leak": no_session,
        "pose_only": pose_only,
        "angles_only": angles,
    }


def models() -> dict:
    return {
        "rf_reg": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_leaf=25,
                                           max_features=0.3, class_weight="balanced",
                                           random_state=42, n_jobs=2)),
        ]),
        "logreg": Pipeline([
            ("imp", SimpleImputer(strategy="median")),
            ("sc", StandardScaler()),
            ("clf", LogisticRegression(C=0.05, max_iter=3000, class_weight="balanced")),
        ]),
    }


def video_agg(df: pd.DataFrame, proba: np.ndarray) -> pd.DataFrame:
    t = df[["video_id", "label", "subject", "view"]].copy()
    t["p"] = proba
    return t.groupby("video_id").agg(label=("label", "first"), subject=("subject", "first"),
                                     view=("view", "first"), p=("p", "mean")).reset_index()


def best_f1(y: np.ndarray, p: np.ndarray) -> tuple[float, float]:
    best_thr, best = 0.5, -1.0
    for thr in np.arange(0.2, 0.81, 0.02):
        f = f1_score(y, (p >= thr).astype(int), zero_division=0)
        if f > best:
            best, best_thr = f, float(thr)
    return best, best_thr


def main() -> None:
    df = pd.read_parquet(os.path.join(DS, "windows.parquet"))
    all_cols = json.load(open(os.path.join(DS, "feature_names.json")))
    fsets = feature_sets(all_cols)
    print("feature set sizes:", {k: len(v) for k, v in fsets.items()}, flush=True)

    gkf = GroupKFold(n_splits=5)
    rows = []
    for ex in ["squat", "bicep_curl", "push_up"]:
        d = df[df["exercise"] == ex].reset_index(drop=True)
        groups = d["subject"].to_numpy()
        y = d["label"].to_numpy()
        for fname, cols in fsets.items():
            for mname, proto in models().items():
                print(f"start {ex} {fname} {mname}", flush=True)
                oof = np.zeros(len(d))
                for tr_idx, te_idx in gkf.split(d, y, groups):
                    from sklearn.base import clone
                    m = clone(proto)
                    m.fit(d.iloc[tr_idx][cols].to_numpy(np.float32), y[tr_idx])
                    oof[te_idx] = m.predict_proba(d.iloc[te_idx][cols].to_numpy(np.float32))[:, 1]
                auc = roc_auc_score(y, oof)
                wf1, thr = best_f1(y, oof)
                vid = video_agg(d, oof)
                vf1, vthr = best_f1(vid["label"].to_numpy(), vid["p"].to_numpy())
                vauc = roc_auc_score(vid["label"], vid["p"]) if len(set(vid["label"])) > 1 else float("nan")
                rows.append(dict(exercise=ex, features=fname, n_features=len(cols), model=mname,
                                 win_auc=round(auc, 3), win_f1=round(wf1, 3),
                                 vid_auc=round(vauc, 3), vid_f1=round(vf1, 3)))
                print(f"{ex:11s} {fname:16s} {mname:8s} win_auc={auc:.3f} vid_auc={vauc:.3f} "
                      f"vid_f1={vf1:.3f}", flush=True)

    res = pd.DataFrame(rows).sort_values(["exercise", "vid_auc"], ascending=[True, False])
    res.to_csv(os.path.join(DS, "generalization_experiment.csv"), index=False)
    print("\n===== BEST PER EXERCISE (by video AUC, 5-fold subject CV) =====", flush=True)
    for ex, g in res.groupby("exercise"):
        print(g.head(3).to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
