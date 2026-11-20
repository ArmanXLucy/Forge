"""
train_baseline.py
=================
Per-exercise Random Forest classifiers (GOOD vs BAD) with subject-level splits
and honest evaluation.

    /content/fitness/dataset/windows.parquet
      -> /content/fitness/models/rf_<exercise>.joblib
      -> /content/fitness/models/metrics.json
      -> /content/fitness/models/feature_importance_<exercise>.csv

Reported metrics
----------------
* window level  : every 2s window is an independent test case
* video level   : all windows of one video are averaged into one prediction
                  (this is what the product actually does, per set)
* false-accept rate for BAD form: share of BAD videos called GOOD. Minimising
  this is the primary objective - telling someone their form is fine when it
  is not is the expensive error.
"""

from __future__ import annotations

import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline

ROOT = "/content/fitness"
DS = os.path.join(ROOT, "dataset")
MODELS = os.path.join(ROOT, "models")
os.makedirs(MODELS, exist_ok=True)

EXERCISES = ["squat", "bicep_curl", "push_up"]
SPLIT_PATH = os.path.join(DS, "splits.json")

RF_PARAMS = dict(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=3,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)


def make_splits(subjects: list[str], seed: int = 42) -> dict:
    """70 / 15 / 15 subject-level split, stratified on subject id only.

    Every subject in this dataset contributes both GOOD and BAD clips for every
    exercise, so a plain shuffled subject split keeps both classes present.
    """
    rng = np.random.RandomState(seed)
    subs = sorted(subjects)
    rng.shuffle(subs)
    n = len(subs)
    n_test = max(3, int(round(0.15 * n)))
    n_val = max(3, int(round(0.15 * n)))
    test = sorted(subs[:n_test])
    val = sorted(subs[n_test:n_test + n_val])
    train = sorted(subs[n_test + n_val:])
    return {"train": train, "val": val, "test": test}


def metrics_block(y, proba, thr=0.5):
    pred = (proba >= thr).astype(int)
    cm = confusion_matrix(y, pred, labels=[0, 1])
    # cm rows = truth (0=BAD, 1=GOOD), cols = prediction
    tn, fp, fn, tp = cm.ravel()
    return {
        "n": int(len(y)),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, proba)) if len(set(y)) > 1 else float("nan"), 4),
        "confusion": {"tn_bad_correct": int(tn), "fp_bad_as_good": int(fp),
                      "fn_good_as_bad": int(fn), "tp_good_correct": int(tp)},
        # The costly error: BAD form labelled GOOD.
        "false_accept_rate_bad_as_good": round(float(fp / (fp + tn)) if (fp + tn) else 0.0, 4),
        "false_reject_rate_good_as_bad": round(float(fn / (fn + tp)) if (fn + tp) else 0.0, 4),
    }


def choose_threshold(y, proba, max_far: float = 0.20) -> float:
    """Pick the window threshold on the VALIDATION split only.

    Objective: maximise F1, while keeping the BAD->GOOD false-accept rate under
    `max_far`. A pure false-accept objective is degenerate - it is minimised by
    predicting BAD always - so F1 leads and the false-accept ceiling constrains.
    """
    pool = []
    for thr in np.arange(0.2, 0.81, 0.02):
        m = metrics_block(y, proba, float(round(thr, 2)))
        pool.append((float(round(thr, 2)), m))
    eligible = [p for p in pool if p[1]["false_accept_rate_bad_as_good"] <= max_far]
    if not eligible:
        eligible = pool
    eligible.sort(key=lambda p: (-p[1]["f1"], p[1]["false_accept_rate_bad_as_good"]))
    return eligible[0][0]


def video_level(df: pd.DataFrame, proba: np.ndarray, thr: float) -> pd.DataFrame:
    tmp = df[["video_id", "exercise", "quality", "subject", "view", "label"]].copy()
    tmp["proba_good"] = proba
    agg = tmp.groupby("video_id").agg(
        exercise=("exercise", "first"),
        quality=("quality", "first"),
        subject=("subject", "first"),
        view=("view", "first"),
        label=("label", "first"),
        proba_good=("proba_good", "mean"),
        n_windows=("proba_good", "size"),
    ).reset_index()
    agg["pred"] = (agg["proba_good"] >= thr).astype(int)
    return agg


def main() -> None:
    df = pd.read_parquet(os.path.join(DS, "windows.parquet"))
    with open(os.path.join(DS, "feature_names.json")) as fh:
        feature_cols = json.load(fh)

    subjects = sorted(df["subject"].unique())
    splits = json.load(open(SPLIT_PATH)) if os.path.exists(SPLIT_PATH) else make_splits(subjects)
    with open(SPLIT_PATH, "w") as fh:
        json.dump(splits, fh, indent=2)

    print("subject split:", json.dumps(splits), flush=True)
    for name, subs in splits.items():
        sub = df[df["subject"].isin(subs)]
        print(f"  {name}: {len(sub)} windows, subjects={len(subs)}, "
              f"good={int((sub['label'] == 1).sum())}, bad={int((sub['label'] == 0).sum())}",
              flush=True)

    all_metrics = {"splits": splits, "exercises": {}}

    for ex in EXERCISES:
        ex_df = df[df["exercise"] == ex].reset_index(drop=True)
        tr = ex_df[ex_df["subject"].isin(splits["train"])]
        va = ex_df[ex_df["subject"].isin(splits["val"])]
        te = ex_df[ex_df["subject"].isin(splits["test"])]

        print(f"\n=== {ex} ===", flush=True)
        print(f"windows train/val/test = {len(tr)}/{len(va)}/{len(te)}", flush=True)

        pipe = Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("rf", RandomForestClassifier(**RF_PARAMS)),
        ])
        pipe.fit(tr[feature_cols].to_numpy(np.float32), tr["label"].to_numpy())

        p_va = pipe.predict_proba(va[feature_cols].to_numpy(np.float32))[:, 1]
        thr = choose_threshold(va["label"].to_numpy(), p_va)

        results = {}
        for split_name, split_df in (("val", va), ("test", te)):
            X = split_df[feature_cols].to_numpy(np.float32)
            y = split_df["label"].to_numpy()
            p = pipe.predict_proba(X)[:, 1]

            vid = video_level(split_df, p, thr)
            results[split_name] = {
                "threshold": thr,
                "window": metrics_block(y, p, thr),
                "video": metrics_block(vid["label"].to_numpy(), vid["proba_good"].to_numpy(), thr),
                "per_view": {
                    v: metrics_block(g["label"].to_numpy(), g["proba_good"].to_numpy(), thr)
                    for v, g in vid.groupby("view")
                },
                "per_subject": {
                    s: metrics_block(g["label"].to_numpy(), g["proba_good"].to_numpy(), thr)
                    for s, g in vid.groupby("subject")
                },
            }
            print(f"[{split_name}] threshold={thr}  window F1={results[split_name]['window']['f1']} "
                  f"video F1={results[split_name]['video']['f1']} "
                  f"video acc={results[split_name]['video']['accuracy']} "
                  f"false-accept(BAD->GOOD)={results[split_name]['video']['false_accept_rate_bad_as_good']}",
                  flush=True)

        # Classification report for the test split, as a readable artefact.
        vid_te = video_level(te, pipe.predict_proba(te[feature_cols].to_numpy(np.float32))[:, 1], thr)
        results["test"]["report"] = classification_report(
            vid_te["label"].to_numpy(), vid_te["pred"].to_numpy(),
            target_names=["BAD", "GOOD"], output_dict=True, zero_division=0
        )

        joblib.dump(
            {"pipeline": pipe, "feature_cols": feature_cols, "threshold": thr,
             "exercise": ex, "rf_params": RF_PARAMS},
            os.path.join(MODELS, f"rf_{ex}.joblib"),
        )

        imp = pd.DataFrame({
            "feature": feature_cols,
            "importance": pipe.named_steps["rf"].feature_importances_,
        }).sort_values("importance", ascending=False)
        imp.to_csv(os.path.join(MODELS, f"feature_importance_{ex}.csv"), index=False)
        print("top features:", imp.head(8)["feature"].tolist(), flush=True)

        all_metrics["exercises"][ex] = results

    with open(os.path.join(MODELS, "metrics.json"), "w") as fh:
        json.dump(all_metrics, fh, indent=2)
    print("\nsaved metrics ->", os.path.join(MODELS, "metrics.json"), flush=True)


if __name__ == "__main__":
    main()
