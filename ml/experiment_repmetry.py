"""
experiment_repmetry.py
======================
Is the dataset's good/bad label mostly a *tempo and repetition-structure*
difference rather than a joint-angle difference?

Motivation: clip-level angle features gave AUC 0.55-0.75 on held-out
participants, and the mean elbow ROM of GOOD and BAD curl clips differed by
0.1 degrees. That is not how a coach distinguishes them. What a coach actually
sees is cadence, control and consistency of the rep rhythm.

This script derives repetition-level features from each clip using a
percentile-based hysteresis detector (scale-free, so it transfers across people
and camera setups), then:

1. prints the univariate ROC AUC of every feature on good vs bad
2. re-runs 5-fold GroupKFold on participants with these features

Run: python experiment_repmetry.py
"""

from __future__ import annotations

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

PRIMARY_ANGLE = {
    "squat": "knee_angle_mean",
    "bicep_curl": "elbow_angle_mean",
    "push_up": "elbow_angle_mean",
}


def detect_reps(angle: np.ndarray, t: np.ndarray, low_q=15, high_q=85):
    """Hysteresis rep detector with per-clip percentile thresholds.

    Using percentiles instead of fixed degrees means a stiff person and a mobile
    person are measured the same way - important when the test set is new people.
    """
    v = angle[np.isfinite(angle)]
    if len(v) < 10:
        return [], np.nan, np.nan
    low = np.percentile(v, low_q)
    high = np.percentile(v, high_q)
    if high - low < 8:  # no meaningful movement in this clip
        return [], low, high

    events = []          # (t_start, t_bottom, t_top)
    state = "top"
    t_start = None
    t_bottom = None
    for vi, ti in zip(angle, t):
        if not np.isfinite(vi):
            continue
        if state == "top" and vi <= low:
            state, t_bottom, t_start = "bottom", ti, None
        elif state == "bottom" and vi >= high:
            state = "top"
            events.append((t_bottom, ti))
    return events, low, high


def rep_features(g: pd.DataFrame, angle_col: str) -> dict:
    g = g.sort_values("t_sec")
    a = g[angle_col].to_numpy(dtype=float)
    t = g["t_sec"].to_numpy(dtype=float)
    dur = float(t[-1] - t[0]) if len(t) > 1 else np.nan
    events, low, high = detect_reps(a, t)
    n = len(events)
    out = {
        "rep_count": n,
        "duration_sec": dur,
        "rep_rate_per_sec": (n / dur) if dur and dur > 0 else np.nan,
        "angle_range_clip": float(np.nanmax(a) - np.nanmin(a)) if len(a) else np.nan,
        "bottom_threshold": low,
        "top_threshold": high,
    }
    if n >= 2:
        periods = np.diff([e[1] for e in events])
        out["rep_period_mean"] = float(np.mean(periods))
        out["rep_period_std"] = float(np.std(periods))
        out["rep_period_cv"] = float(np.std(periods) / np.mean(periods)) if np.mean(periods) else np.nan
        out["rep_period_min"] = float(np.min(periods))
        out["rep_period_max"] = float(np.max(periods))
        # Time spent near the bottom (control) vs. bouncing through it.
        span = high - low
        if span > 1e-6:
            norm = (a - low) / span
            out["frac_below_25pct"] = float(np.mean(norm < 0.25))
            out["frac_above_75pct"] = float(np.mean(norm > 0.75))
            out["frac_mid"] = float(np.mean((norm >= 0.25) & (norm <= 0.75)))
    else:
        for k in ["rep_period_mean", "rep_period_std", "rep_period_cv",
                  "rep_period_min", "rep_period_max", "frac_below_25pct",
                  "frac_above_75pct", "frac_mid"]:
            out[k] = np.nan
    if n >= 1 and bool(np.isfinite(out.get("angle_range_clip", np.nan))):
        out["rom_per_rep"] = out["angle_range_clip"] / n
    else:
        out["rom_per_rep"] = np.nan
    return out


def build(df_frames: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for vid, g in df_frames.groupby("video_id", sort=False):
        ex = g["exercise"].iloc[0]
        rec = {"video_id": vid, "exercise": ex, "quality": g["quality"].iloc[0],
               "view": g["view"].iloc[0], "subject": g["subject"].iloc[0],
               "label": int(g["label"].iloc[0])}
        rec.update(rep_features(g, PRIMARY_ANGLE[ex]))
        rows.append(rec)
    return pd.DataFrame(rows)


def univariate(df: pd.DataFrame, feat_cols: list[str]) -> None:
    print("\n===== univariate ROC AUC per feature (clip level, all participants) =====", flush=True)
    rows = []
    for ex in ["squat", "bicep_curl", "push_up"]:
        d = df[df.exercise == ex]
        y = d["label"].to_numpy()
        for c in feat_cols:
            v = d[c].to_numpy(dtype=float)
            m = np.isfinite(v)
            if m.sum() < 20 or len(set(y[m])) < 2:
                continue
            auc = roc_auc_score(y[m], v[m])
            rows.append({"exercise": ex, "feature": c, "auc": round(max(auc, 1 - auc), 3),
                         "direction": "higher=BAD" if auc < 0.5 else "higher=GOOD"})
    r = pd.DataFrame(rows).sort_values(["exercise", "auc"], ascending=[True, False])
    for ex, g in r.groupby("exercise"):
        print(f"\n-- {ex} --", flush=True)
        print(g.head(10).to_string(index=False), flush=True)
    r.to_csv(os.path.join(DS, "univariate_auc.csv"), index=False)


def cv(df: pd.DataFrame, feat_cols: list[str]) -> pd.DataFrame:
    gkf = GroupKFold(n_splits=5)
    protos = {
        "logreg": Pipeline([("imp", SimpleImputer(strategy="median")),
                            ("sc", StandardScaler()),
                            ("clf", LogisticRegression(C=0.3, max_iter=5000,
                                                       class_weight="balanced"))]),
        "rf_d3": Pipeline([("imp", SimpleImputer(strategy="median")),
                           ("clf", RandomForestClassifier(n_estimators=400, max_depth=3,
                                                          min_samples_leaf=8, max_features=0.6,
                                                          class_weight="balanced",
                                                          random_state=42, n_jobs=2))]),
    }
    rows = []
    print("\n===== 5-fold GroupKFold on participants (rep/tempo features) =====", flush=True)
    for ex in ["squat", "bicep_curl", "push_up"]:
        d = df[df.exercise == ex].reset_index(drop=True)
        y = d["label"].to_numpy()
        groups = d["subject"].to_numpy()
        for name, proto in protos.items():
            oof = np.zeros(len(d))
            for tr, te in gkf.split(d, y, groups):
                m = clone(proto)
                m.fit(d.iloc[tr][feat_cols].to_numpy(np.float32), y[tr])
                oof[te] = m.predict_proba(d.iloc[te][feat_cols].to_numpy(np.float32))[:, 1]
            auc = roc_auc_score(y, oof)
            best_f1, best_thr = -1.0, 0.5
            for thr in np.arange(0.2, 0.81, 0.02):
                f = f1_score(y, (oof >= thr).astype(int), zero_division=0)
                if f > best_f1:
                    best_f1, best_thr = f, float(thr)
            acc = float(((oof >= best_thr).astype(int) == y).mean())
            rows.append(dict(exercise=ex, model=name, n=len(d), auc=round(auc, 3),
                             f1=round(best_f1, 3), acc=round(acc, 3), thr=best_thr))
            print(f"{ex:11s} {name:8s} auc={auc:.3f} f1={best_f1:.3f} acc={acc:.3f}", flush=True)
    r = pd.DataFrame(rows)
    r.to_csv(os.path.join(DS, "repmetry_cv_results.csv"), index=False)
    return r


def main() -> None:
    frames = pd.read_parquet(os.path.join(DS, "frames.parquet"))
    rep = build(frames)
    rep.to_parquet(os.path.join(DS, "rep_features.parquet"), index=False)
    print("clips:", len(rep), flush=True)
    print(rep.groupby(["exercise", "label"])[["rep_count", "rep_rate_per_sec",
                                              "rep_period_cv", "rom_per_rep"]].mean().round(3),
          flush=True)

    feat_cols = [c for c in rep.columns if c not in
                 ("video_id", "exercise", "quality", "view", "subject", "label")]
    univariate(rep, feat_cols)
    cv(rep, feat_cols)


if __name__ == "__main__":
    main()
