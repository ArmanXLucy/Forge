"""
train_final.py
==============
Final model: one sample per clip, pose-derived + repetition/tempo features,
RandomForest, evaluated on participants never seen in training, exported to ONNX.

Why clip-level and not the 2 s window model
-------------------------------------------
Measured on this dataset (see experiment_*.py):
  window model (291 features, 22,662 windows) -> test AUC 0.72 / 0.54 / 0.75
  clip model   (49 features, 444 clips)        -> CV AUC   0.67 / 0.55 / 0.75
  tempo only   (13 features)                   -> CV AUC   0.62 / 0.60 / 0.72
The clip model is smaller, matches how the product scores a *set*, and does not
overfit participants as hard. Tempo and pose features are complementary, so the
final model uses both.

Outputs
-------
models/final_<exercise>.joblib
export/form_classifier_<exercise>.onnx
export/model_metadata.json
export/final_metrics.json
"""

from __future__ import annotations

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline

ROOT = "/content/fitness"
DS = os.path.join(ROOT, "dataset")
MODELS = os.path.join(ROOT, "models")
EXPORT = os.path.join(ROOT, "export")
os.makedirs(MODELS, exist_ok=True)
os.makedirs(EXPORT, exist_ok=True)

EXERCISES = ["squat", "bicep_curl", "push_up"]
VERSION = "1.0.0"
META_COLS = ("video_id", "exercise", "quality", "view", "subject", "label",
             "n_frames", "duration_sec", "rep_count", "bottom_threshold", "top_threshold")

RF = dict(n_estimators=400, max_depth=6, min_samples_leaf=3, max_features=0.5,
          class_weight="balanced", random_state=42, n_jobs=2)


def metrics(y, p, thr):
    pred = (p >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "n": int(len(y)),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y, p)) if len(set(y.tolist())) > 1 else float("nan"), 4),
        "confusion": {"tn_bad_correct": int(tn), "fp_bad_as_good": int(fp),
                      "fn_good_as_bad": int(fn), "tp_good_correct": int(tp)},
        "false_accept_rate_bad_as_good": round(float(fp / (fp + tn)) if (fp + tn) else 0.0, 4),
        "false_reject_rate_good_as_bad": round(float(fn / (fn + tp)) if (fn + tp) else 0.0, 4),
    }


def choose_threshold(y, p, max_far=0.20):
    """Maximise F1 subject to a false-accept ceiling (never 'always BAD')."""
    pool = []
    for thr in np.arange(0.2, 0.81, 0.02):
        m = metrics(y, p, float(round(thr, 2)))
        pool.append((float(round(thr, 2)), m))
    ok = [x for x in pool if x[1]["false_accept_rate_bad_as_good"] <= max_far] or pool
    ok.sort(key=lambda x: (-x[1]["f1"], x[1]["false_accept_rate_bad_as_good"]))
    return ok[0][0]


def load_clips() -> pd.DataFrame:
    clip = pd.read_parquet(os.path.join(DS, "clip_features.parquet"))
    rep = pd.read_parquet(os.path.join(DS, "rep_features.parquet"))
    rep_cols = [c for c in rep.columns if c not in
                ("video_id", "exercise", "quality", "view", "subject", "label", "duration_sec")]
    df = clip.merge(rep[["video_id"] + rep_cols], on="video_id", how="left", validate="one_to_one")
    return df


def main() -> None:
    df = load_clips()
    feat_cols = [c for c in df.columns if c not in META_COLS and not c.startswith("view_")]
    splits = json.load(open(os.path.join(DS, "splits.json")))
    print(f"clips {len(df)}  features {len(feat_cols)}", flush=True)
    print(f"participants: train {len(splits['train'])} val {len(splits['val'])} "
          f"test {len(splits['test'])}", flush=True)

    proto = Pipeline([("imp", SimpleImputer(strategy="median")),
                      ("clf", RandomForestClassifier(**RF))])
    results = {"version": VERSION, "splits": splits, "feature_order": feat_cols,
               "rf_params": RF, "exercises": {}}

    for ex in EXERCISES:
        d = df[df.exercise == ex].reset_index(drop=True)
        y = d["label"].to_numpy()
        groups = d["subject"].to_numpy()
        X = d[feat_cols].to_numpy(np.float32)

        # ---- honest estimate: 5-fold GroupKFold on participants -------------
        oof = np.zeros(len(d))
        for tr, te in GroupKFold(n_splits=5).split(X, y, groups):
            m = clone(proto)
            m.fit(X[tr], y[tr])
            oof[te] = m.predict_proba(X[te])[:, 1]
        cv_auc = roc_auc_score(y, oof)
        cv_thr = choose_threshold(y, oof)
        cv = metrics(y, oof, cv_thr)

        # ---- final fit on train, threshold on val, report test --------------
        tr = d["subject"].isin(splits["train"]).to_numpy()
        va = d["subject"].isin(splits["val"]).to_numpy()
        te = d["subject"].isin(splits["test"]).to_numpy()

        final = clone(proto)
        final.fit(X[tr], y[tr])
        p_va = final.predict_proba(X[va])[:, 1]
        thr = choose_threshold(y[va], p_va)
        p_te = final.predict_proba(X[te])[:, 1]
        test_m = metrics(y[te], p_te, thr)
        val_m = metrics(y[va], p_va, thr)

        print(f"\n=== {ex} (n={len(d)}) ===", flush=True)
        print(f"  CV  (5-fold group)  AUC {cv_auc:.3f}  F1 {cv['f1']:.3f}  "
              f"acc {cv['accuracy']:.3f}  false-accept {cv['false_accept_rate_bad_as_good']:.3f}",
              flush=True)
        print(f"  TEST (held-out people) AUC {test_m['roc_auc']:.3f}  F1 {test_m['f1']:.3f}  "
              f"acc {test_m['accuracy']:.3f}  false-accept "
              f"{test_m['false_accept_rate_bad_as_good']:.3f}  thr {thr}", flush=True)

        # Refit on train+val (test participants stay untouched) for shipping.
        ship = clone(proto)
        keep = tr | va
        ship.fit(X[keep], y[keep])

        joblib.dump({"pipeline": ship, "feature_cols": feat_cols, "threshold": thr,
                     "exercise": ex, "rf_params": RF, "version": VERSION},
                    os.path.join(MODELS, f"final_{ex}.joblib"))

        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        onx = convert_sklearn(ship, initial_types=[("input", FloatTensorType([None, len(feat_cols)]))],
                              target_opset=15, options={id(ship): {"zipmap": False}})
        onx_path = os.path.join(EXPORT, f"form_classifier_{ex}.onnx")
        with open(onx_path, "wb") as fh:
            fh.write(onx.SerializeToString())

        # Parity check sklearn vs onnxruntime, including NaN handling.
        import onnxruntime as ort
        sess = ort.InferenceSession(onx_path, providers=["CPUExecutionProvider"])
        names = [o.name for o in sess.get_outputs()]
        xs = np.vstack([X[te][:32], np.full((1, len(feat_cols)), np.nan, dtype=np.float32)])
        sk = ship.predict_proba(xs)[:, 1]
        ox = sess.run(names, {"input": xs})
        ox = np.asarray(ox[names.index("probabilities") if "probabilities" in names else 1])[:, 1]
        diff = float(np.max(np.abs(sk - ox)))
        print(f"  ONNX {os.path.getsize(onx_path)/1e3:.1f} kB  parity max diff {diff:.2e}",
              flush=True)

        results["exercises"][ex] = {
            "n_clips": int(len(d)),
            "threshold": thr,
            "cv_5fold_group": {**cv, "roc_auc": round(float(cv_auc), 4)},
            "val": val_m,
            "test": test_m,
            "onnx_file": os.path.basename(onx_path),
            "onnx_parity_max_abs_diff": diff,
            "top_features": pd.Series(ship.named_steps["clf"].feature_importances_,
                                      index=feat_cols).sort_values(ascending=False)
                              .head(10).round(4).to_dict(),
        }

    with open(os.path.join(EXPORT, "final_metrics.json"), "w") as fh:
        json.dump(results, fh, indent=2)
    with open(os.path.join(EXPORT, "model_metadata.json"), "w") as fh:
        json.dump({
            "version": VERSION,
            "unit": "one clip (exercise set)",
            "pose_model": "pose_landmarker_full.task",
            "feature_order": feat_cols,
            "feature_source": "ml/fitness_features.py + ml/experiment_clip.py + ml/experiment_repmetry.py",
            "class_order": ["BAD", "GOOD"],
            "thresholds": {ex: results["exercises"][ex]["threshold"] for ex in EXERCISES},
            "notes": [
                "Input: float32 [N, len(feature_order)]; NaN allowed (median imputer is in the graph).",
                "Output 'probabilities' columns are [BAD, GOOD]; compare col 1 to the threshold.",
                "Trained on 25-26 participants; validated on participants never seen in training.",
                "Measured accuracy is modest - use as a secondary signal, not the sole verdict.",
            ],
        }, fh, indent=2)

    print("\n===== SUMMARY (held-out participants) =====", flush=True)
    rows = [{"exercise": ex,
             "cv_auc": results["exercises"][ex]["cv_5fold_group"]["roc_auc"],
             "test_auc": results["exercises"][ex]["test"]["roc_auc"],
             "test_f1": results["exercises"][ex]["test"]["f1"],
             "test_acc": results["exercises"][ex]["test"]["accuracy"],
             "false_accept": results["exercises"][ex]["test"]["false_accept_rate_bad_as_good"]}
            for ex in EXERCISES]
    print(pd.DataFrame(rows).to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
