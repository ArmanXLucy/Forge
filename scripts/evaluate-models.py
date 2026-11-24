#!/usr/bin/env python3
"""Phase 4 — reproducible offline evaluation of the deployed AI models.

This script evaluates the exact ONNX artifacts served from public/models/:

1. Form classifiers (squat, bicep_curl, push_up) on the stored clip-level
   features for the participant-independent test split recorded in
   ml/reports/final_metrics.json.
2. The workout-recommendation classifier on the stored synthetic dataset,
   reproducing the stratified 70/15/15 split from the training script.

It writes:
  public/models/evaluation_report.json   (consumed by the admin dashboard)
  ml/reports/phase4_evaluation.json      (full report incl. confusion matrices)

The script is the only supported way to produce official metrics. Nothing in
the browser can write these files or submit evaluation results to Firestore.

Usage:
  python scripts/evaluate-models.py
  python scripts/evaluate-models.py --check
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import onnxruntime as ort
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_REPORT = ROOT / "public" / "models" / "evaluation_report.json"
FULL_REPORT = ROOT / "ml" / "reports" / "phase4_evaluation.json"
FORM_META = ROOT / "public" / "models" / "model_metadata.json"
FORM_METRICS = ROOT / "ml" / "reports" / "final_metrics.json"
DATASET_SUMMARY = ROOT / "ml" / "reports" / "summary.json"
CLIP_FEATURES = ROOT / "ml" / "reports" / "clip_features.parquet"
REP_FEATURES = ROOT / "ml" / "reports" / "rep_features.parquet"
REC_DATA = ROOT / "workout-recommendation" / "data" / "train-00000-of-00001.parquet"
REC_TRAINING = ROOT / "workout-recommendation" / "artifacts" / "training_results.json"

EXERCISES = ["squat", "bicep_curl", "push_up"]
NUMERIC_FEATURES = ["Age", "Weight_kg", "Height_cm", "BMI"]
CATEGORICAL_FEATURES = ["Gender", "Goal", "Equipment", "Experience", "Injury"]
REC_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
REC_TARGET = "Recommended_Plan"
RANDOM_STATE = 42


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def round_metric(value: float) -> float:
    return round(float(value), 4)


def binary_metrics(y_true: np.ndarray, y_pred: np.ndarray, p_good: np.ndarray) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    good_support = int((y_true == 1).sum())
    bad_support = int((y_true == 0).sum())
    has_both = len(np.unique(y_true)) == 2
    return {
        "n": int(len(y_true)),
        "goodCount": good_support,
        "badCount": bad_support,
        "accuracy": round_metric(accuracy_score(y_true, y_pred)),
        "precision": round_metric(precision_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "recall": round_metric(recall_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "f1": round_metric(f1_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "rocAuc": round_metric(roc_auc_score(y_true, p_good)) if has_both else None,
        "confusion": {
            "tnBadCorrect": int(tn),
            "fpBadAsGood": int(fp),
            "fnGoodAsBad": int(fn),
            "tpGoodCorrect": int(tp),
        },
        "falseAcceptRate": round_metric(fp / bad_support) if bad_support else None,
        "falseRejectRate": round_metric(fn / good_support) if good_support else None,
    }


def evaluate_form_models() -> tuple[list[dict], dict]:
    metadata = json.loads(FORM_META.read_text(encoding="utf-8"))
    stored = json.loads(FORM_METRICS.read_text(encoding="utf-8"))
    summary = json.loads(DATASET_SUMMARY.read_text(encoding="utf-8"))
    feature_order = metadata["feature_order"]
    splits = stored["splits"]

    clip = pd.read_parquet(CLIP_FEATURES)
    rep = pd.read_parquet(REP_FEATURES)
    rep_columns = [
        column
        for column in rep.columns
        if column
        not in ("video_id", "exercise", "quality", "view", "subject", "label", "duration_sec")
    ]
    rep_subset = rep[["video_id", *rep_columns]].copy()
    rep_subset.columns = ["video_id"] + [
        f"{column}_rep" if column in clip.columns else column for column in rep_columns
    ]
    merged = clip.merge(rep_subset, on="video_id", how="left", validate="one_to_one")
    for column in list(merged.columns):
        if column.endswith("_rep") and column[:-4] in feature_order:
            merged[column[:-4]] = merged[column]
    missing = [feature for feature in feature_order if feature not in merged.columns]
    if missing:
        raise SystemExit(f"Feature reconstruction failed; missing columns: {missing}")

    models: list[dict] = []
    detail: dict = {"featureOrder": feature_order, "splits": splits, "exercises": {}}
    for exercise in EXERCISES:
        onnx_path = ROOT / "public" / "models" / f"form_classifier_{exercise}.onnx"
        session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        rows = merged[merged["exercise"] == exercise].copy()
        test_rows = rows[rows["subject"].isin(splits["test"])].copy()
        if test_rows.empty:
            raise SystemExit(f"No held-out rows for {exercise}")
        x = test_rows[feature_order].to_numpy(dtype=np.float32)
        y = test_rows["label"].to_numpy(dtype=np.int64)
        started = time.perf_counter()
        outputs = session.run(None, {input_name: x})
        elapsed_ms = (time.perf_counter() - started) * 1000
        output_names = [output.name for output in session.get_outputs()]
        probability_index = (
            output_names.index("probabilities") if "probabilities" in output_names else len(outputs) - 1
        )
        probabilities = np.asarray(outputs[probability_index], dtype=np.float64)
        p_good = probabilities[:, 1]
        threshold = float(metadata["thresholds"][exercise])
        y_pred = (p_good >= threshold).astype(np.int64)
        metrics = binary_metrics(y, y_pred, p_good)
        reference = stored["exercises"][exercise]["test"]
        metrics["matchesStoredReport"] = abs(metrics["accuracy"] - reference["accuracy"]) < 0.0001 and all(
            metrics["confusion"][key] == reference["confusion"][key]
            for key in ("tnBadCorrect", "fpBadAsGood", "fnGoodAsBad", "tpGoodCorrect")
        )
        model = {
            "id": f"form_classifier_{exercise}",
            "name": f"{exercise.replace('_', ' ').title()} form classifier",
            "task": "binary-form-classification",
            "feature": "ai-coach",
            "version": metadata["version"],
            "fileName": onnx_path.name,
            "sha256": sha256(onnx_path),
            "sizeBytes": onnx_path.stat().st_size,
            "threshold": threshold,
            "dataset": {
                "name": "Forge form dataset — held-out participants",
                "description": (
                    "One 2-second clip window per video, reconstructed from the stored clip and rep "
                    "feature extracts. Test participants were never used for training or thresholding."
                ),
                "evaluationUnit": "one clip (exercise set)",
                "split": f"test participants: {', '.join(splits['test'])}",
                "sampleCount": int(len(test_rows)),
                "participantCount": int(test_rows["subject"].nunique()),
                "sourceVideos": int(summary["videos"]),
                "allWindows": int(summary["windows"]),
            },
            "metrics": metrics,
            "baseline": {
                "source": "ml/reports/final_metrics.json",
                "measuredOn": "pre-refit model (trained on training participants only)",
                "accuracy": reference["accuracy"],
                "precision": reference["precision"],
                "recall": reference["recall"],
                "f1": reference["f1"],
                "rocAuc": reference["roc_auc"],
                "confusion": reference["confusion"],
            },
            "reproduction": {
                "status": "artifact-drift" if not metrics["matchesStoredReport"] else "exact",
                "detail": (
                    "The stored report measured a model fitted on training participants only. The "
                    "shipped ONNX artifact was refit on training + validation participants after "
                    "that measurement, so its held-out scores cannot equal the stored number. "
                    "The values above are the deployed artifact's actual scores."
                ),
            },
            "runtime": {
                "backend": "onnxruntime CPU",
                "batchInferenceMs": round(elapsed_ms, 2),
                "perSampleMs": round(elapsed_ms / max(1, len(test_rows)), 3),
            },
            "limitations": [
                "Only 24 held-out clips per exercise are available in the repository.",
                "Raw videos and the original window-level dataset are not stored, so video-level metrics cannot be recomputed here.",
                "The shipped client uses the same ONNX graph but WASM timing differs from this CPU batch measurement.",
            ],
        }
        models.append(model)
        detail["exercises"][exercise] = {
            "metrics": metrics,
            "threshold": threshold,
            "fileName": onnx_path.name,
            "sha256": model["sha256"],
            "batchPredictionSeconds": round(elapsed_ms / 1000, 4),
            "predictions": [int(value) for value in y_pred],
            "labels": [int(value) for value in y],
            "probabilities": [round(float(value), 6) for value in p_good],
        }
    return models, detail


def prepare_recommendation_frame(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.copy()
    df["Experience"] = df["Experience"].fillna("Unknown").astype(str).str.strip()
    df["Injury"] = df["Injury"].fillna("Unknown").astype(str).str.strip()
    df["Injury"] = df["Injury"].replace({"": "Unknown", "none": "None"})
    for column in ["Gender", "Goal", "Equipment", REC_TARGET]:
        df[column] = df[column].astype(str).str.strip()
    raw_features = NUMERIC_FEATURES[:3] + CATEGORICAL_FEATURES
    df = df.drop_duplicates(subset=raw_features + [REC_TARGET], keep="first").reset_index(drop=True)
    df["BMI"] = df["Weight_kg"] / (df["Height_cm"] / 100.0) ** 2
    return df


def evaluate_recommendation_model() -> tuple[dict, dict]:
    raw = pd.read_parquet(REC_DATA)
    df = prepare_recommendation_frame(raw)
    encoder = LabelEncoder()
    y = encoder.fit_transform(df[REC_TARGET])
    label_names = [str(value) for value in encoder.classes_]
    x_frame = df[REC_FEATURES]

    _, x_holdout, _, y_holdout = train_test_split(
        x_frame, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    _, x_test, _, y_test = train_test_split(
        x_holdout, y_holdout, test_size=0.50, random_state=RANDOM_STATE, stratify=y_holdout
    )

    onnx_path = ROOT / "public" / "models" / "workout_recommendation.onnx"
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    feed = {
        feature: x_test[feature].to_numpy(dtype=np.float32).reshape(-1, 1)
        for feature in NUMERIC_FEATURES
    }
    for feature in CATEGORICAL_FEATURES:
        feed[feature] = np.asarray(x_test[feature].astype(str).tolist(), dtype=object).reshape(-1, 1)

    started = time.perf_counter()
    outputs = session.run(None, feed)
    elapsed_ms = (time.perf_counter() - started) * 1000
    output_names = [output.name for output in session.get_outputs()]
    probability_index = (
        output_names.index("probabilities") if "probabilities" in output_names else len(outputs) - 1
    )
    probabilities = np.asarray(outputs[probability_index], dtype=np.float64)
    y_pred = np.argmax(probabilities, axis=1)
    label_index = output_names.index("label") if "label" in output_names else 0
    label_output = np.asarray(outputs[label_index]).reshape(-1).astype(np.int64)
    label_agreement = float(np.mean(label_output == y_pred))

    stored = json.loads(REC_TRAINING.read_text(encoding="utf-8"))
    stored_test = stored["test"]
    per_class = {}
    for index, label in enumerate(label_names):
        mask = y_test == index
        per_class[label] = {
            "support": int(mask.sum()),
            "precision": round_metric(
                precision_score(y_test == index, y_pred == index, zero_division=0)
            ),
            "recall": round_metric(recall_score(y_test == index, y_pred == index, zero_division=0)),
            "f1": round_metric(f1_score(y_test == index, y_pred == index, zero_division=0)),
        }

    metrics = {
        "n": int(len(y_test)),
        "classCount": len(label_names),
        "accuracy": round_metric(accuracy_score(y_test, y_pred)),
        "macroPrecision": round_metric(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "macroRecall": round_metric(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "macroF1": round_metric(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "weightedF1": round_metric(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        "labelAgreement": round_metric(label_agreement),
        "referenceAccuracy": stored_test["accuracy"],
        "matchesStoredReport": abs(accuracy_score(y_test, y_pred) - stored_test["accuracy"]) < 0.0001
        and int(len(y_test)) == int(stored_test["n_samples"]),
        "perClass": per_class,
    }
    model = {
        "id": "workout_recommendation",
        "name": "Workout plan category classifier",
        "task": "multiclass-plan-classification",
        "feature": "workout-recommendation",
        "version": "1.0.0",
        "fileName": onnx_path.name,
        "sha256": sha256(onnx_path),
        "sizeBytes": onnx_path.stat().st_size,
        "threshold": None,
        "dataset": {
            "name": "SmartFit synthetic workout-plan dataset",
            "description": (
                "Synthetic records with a deterministic feature-to-plan mapping. Scores measure "
                "reproduction of that mapping, not generalisation to real athletes."
            ),
            "evaluationUnit": "one member profile",
            "split": "stratified 70% train / 15% validation / 15% test, seed 42",
            "sampleCount": int(len(y_test)),
            "participantCount": None,
            "sourceRecords": int(len(raw)),
            "rowsAfterDedupe": int(len(df)),
        },
        "metrics": metrics,
        "baseline": {
            "source": "workout-recommendation/artifacts/training_results.json",
            "measuredOn": "exported ONNX artifact",
            "accuracy": stored_test["accuracy"],
            "macroF1": stored_test["f1_macro"],
            "weightedF1": stored_test["f1_weighted"],
        },
        "reproduction": {
            "status": "exact" if metrics["matchesStoredReport"] else "drift",
            "detail": "The stored report was produced from the same exported artifact and split, so it should reproduce exactly.",
        },
        "runtime": {
            "backend": "onnxruntime CPU",
            "batchInferenceMs": round(elapsed_ms, 2),
            "perSampleMs": round(elapsed_ms / max(1, len(y_test)), 3),
        },
        "limitations": [
            "The dataset is synthetic and deterministic; 1.0000 accuracy does not imply real-athlete performance.",
            "No real member outcomes are used to validate plan suitability or safety.",
            "The browser executes the same graph with onnxruntime-web WASM; timing differs.",
        ],
    }
    detail = {
        "metrics": metrics,
        "sha256": model["sha256"],
        "labelNames": label_names,
        "confusionMatrix": confusion_matrix(y_test, y_pred, labels=list(range(len(label_names)))).tolist(),
        "batchPredictionSeconds": round(elapsed_ms / 1000, 4),
        "labelAgreement": label_agreement,
    }
    return model, detail


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the evaluated metrics no longer match the stored reports.",
    )
    args = parser.parse_args()
    previous_report = (
        json.loads(PUBLIC_REPORT.read_text(encoding="utf-8")) if PUBLIC_REPORT.exists() else None
    )

    form_models, form_detail = evaluate_form_models()
    recommender, recommender_detail = evaluate_recommendation_model()

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    summary = json.loads(DATASET_SUMMARY.read_text(encoding="utf-8"))
    report = {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "generatedBy": "scripts/evaluate-models.py",
        "official": True,
        "note": (
            "Official offline evaluation of the deployed ONNX artifacts. Generated by a "
            "repository script from stored held-out data; never accepted from a browser or Firestore."
        ),
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "onnxruntime": ort.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
        "datasets": {
            "form": {
                "name": "Forge form dataset",
                "videos": summary["videos"],
                "windows": summary["windows"],
                "participants": 25,
                "windowSeconds": summary["window_sec"],
                "strideSeconds": summary["stride_sec"],
                "meanPoseDetectionRate": summary["pose_detection_rate_mean"],
                "testParticipants": form_detail["splits"]["test"],
                "evaluationUnit": "one clip per video (test participants only)",
            },
            "recommendation": {
                "name": "SmartFit synthetic workout-plan dataset",
                "kind": "synthetic",
                "testSamples": recommender_detail["metrics"]["n"],
            },
        },
        "models": [*form_models, recommender],
    }

    PUBLIC_REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    full = {
        **report,
        "formDetail": form_detail,
        "recommendationDetail": recommender_detail,
    }
    FULL_REPORT.write_text(json.dumps(full, indent=2) + "\n", encoding="utf-8")

    print("")
    print(f"{'Model':<32}{'Samples':>8}{'Accuracy':>10}{'F1':>9}{'Matches':>9}")
    print("-" * 68)
    for model in report["models"]:
        metrics = model["metrics"]
        f1 = metrics.get("macroF1", metrics.get("f1"))
        print(
            f"{model['name']:<32}{metrics['n']:>8}{metrics['accuracy']:>10.4f}"
            f"{f1:>9.4f}{str(metrics['matchesStoredReport']):>9}"
        )
    print("")
    print(f"Report: {PUBLIC_REPORT.relative_to(ROOT)}")
    print(f"Full:   {FULL_REPORT.relative_to(ROOT)}")

    if args.check:
        if previous_report is None:
            print("CHECK FAILED: no previous evaluation report to compare against", file=sys.stderr)
            return 1
        previous_models = {model["id"]: model for model in previous_report.get("models", [])}
        drift: list[str] = []
        for model in report["models"]:
            old = previous_models.get(model["id"])
            if old is None:
                drift.append(f"{model['id']} (new)")
                continue
            if old.get("sha256") != model["sha256"]:
                drift.append(f"{model['id']} hash")
            if abs(old["metrics"]["accuracy"] - model["metrics"]["accuracy"]) > 0.0001:
                drift.append(f"{model['id']} accuracy")
            if abs(old["metrics"]["n"] - model["metrics"]["n"]) > 0:
                drift.append(f"{model['id']} sample count")
        if drift:
            print(f"CHECK FAILED: evaluation drifted: {', '.join(drift)}", file=sys.stderr)
            return 1
        print("CHECK OK: metrics and artifact hashes match the previous report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
