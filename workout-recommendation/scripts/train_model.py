"""Train, evaluate and export the Forge Athletic workout-plan classifier.

The same script is used by ``notebooks/smartfit_training.ipynb`` so the Colab
run and the local verification run are byte-for-byte equivalent.

Usage:
    python scripts/train_model.py [--data data/train-00000-of-00001.parquet]
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler

RANDOM_STATE = 42

NUMERIC_FEATURES = ["Age", "Weight_kg", "Height_cm", "BMI"]
CATEGORICAL_FEATURES = ["Gender", "Goal", "Equipment", "Experience", "Injury"]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "Recommended_Plan"

CATEGORICAL_VALUES = {
    "Gender": ["Female", "Male"],
    "Goal": [
        "Athletic Performance",
        "CrossFit",
        "Endurance",
        "Flexibility",
        "General Health",
        "Marathon Training",
        "Muscle Gain",
        "Powerlifting",
        "Strength",
        "Tone Up",
        "Weight Loss",
    ],
    "Equipment": [
        "Bodyweight Only",
        "Full Home Gym",
        "Gym Membership",
        "Home Dumbbells",
        "Yoga Mat",
    ],
    "Experience": ["Advanced", "Beginner", "Intermediate", "Unknown"],
    "Injury": ["Ankle", "Back", "Knee", "None", "Shoulder", "Unknown"],
}

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
REPORTS = ROOT / "reports"


def prepare_frame(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    report: dict = {"raw_shape": list(raw.shape), "columns": list(raw.columns)}
    df = raw.copy()
    df["Experience"] = df["Experience"].fillna("Unknown").astype(str).str.strip()
    df["Injury"] = df["Injury"].fillna("Unknown").astype(str).str.strip()
    df["Injury"] = df["Injury"].replace({"": "Unknown", "none": "None"})
    for column in ["Gender", "Goal", "Equipment", TARGET]:
        df[column] = df[column].astype(str).str.strip()

    raw_features = NUMERIC_FEATURES[:3] + CATEGORICAL_FEATURES
    report["missing_after_cleanup"] = {k: int(v) for k, v in df.isna().sum().items()}
    report["duplicate_rows"] = int(df.duplicated().sum())
    report["ambiguous_input_groups"] = int(
        df.groupby(raw_features, dropna=False)[TARGET].nunique().gt(1).sum()
    )
    report["class_counts"] = {k: int(v) for k, v in df[TARGET].value_counts().items()}

    # Exact duplicates would otherwise straddle splits and inflate scores.
    deduped = df.drop_duplicates(subset=raw_features + [TARGET], keep="first").reset_index(drop=True)
    report["rows_after_dedupe"] = len(deduped)
    report["removed_duplicates"] = len(df) - len(deduped)

    # BMI is derived deterministically, never collected from mission free text.
    deduped["BMI"] = deduped["Weight_kg"] / (deduped["Height_cm"] / 100.0) ** 2

    report["feature_ranges"] = {
        column: {
            "min": float(deduped[column].min()),
            "max": float(deduped[column].max()),
            "mean": round(float(deduped[column].mean()), 3),
        }
        for column in ["Age", "Weight_kg", "Height_cm", "BMI"]
    }
    report["unique_categorical_values"] = {
        column: sorted(deduped[column].unique().tolist()) for column in CATEGORICAL_FEATURES
    }
    report["label_counts_after_dedupe"] = {
        k: int(v) for k, v in deduped[TARGET].value_counts().items()
    }
    return deduped, report


def build_pipeline(model) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False, dtype=np.float32),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    return Pipeline([("preprocess", preprocessor), ("model", model)])


def metrics(y_true, y_pred, labels) -> dict:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "n_samples": int(len(y_true)),
        "labels": list(labels),
    }


def evaluate(name: str, pipeline: Pipeline, X, y, label_names) -> dict:
    label_indices = list(range(len(label_names)))
    start = time.perf_counter()
    predictions = pipeline.predict(X)
    latency_ms = (time.perf_counter() - start) * 1000
    result = metrics(y, predictions, label_names)
    report = classification_report(
        y,
        predictions,
        labels=label_indices,
        target_names=label_names,
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(y, predictions, labels=label_indices)
    result.update(
        {
            "model": name,
            "predict_seconds": round(latency_ms / 1000, 4),
            "per_class": {
                label: {
                    "precision": round(float(report[label]["precision"]), 4),
                    "recall": round(float(report[label]["recall"]), 4),
                    "f1": round(float(report[label]["f1-score"]), 4),
                    "support": int(report[label]["support"]),
                }
                for label in label_names
            },
            "confusion_matrix": matrix.tolist(),
        }
    )
    return result


def export_onnx(pipeline: Pipeline):
    from skl2onnx import to_onnx
    from skl2onnx.common.data_types import FloatTensorType, StringTensorType

    initial_types = [(feature, FloatTensorType([None, 1])) for feature in NUMERIC_FEATURES] + [
        (feature, StringTensorType([None, 1])) for feature in CATEGORICAL_FEATURES
    ]
    return to_onnx(
        pipeline,
        initial_types=initial_types,
        options={"zipmap": False},
        target_opset=17,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=ROOT / "data" / "train-00000-of-00001.parquet")
    args = parser.parse_args()

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    raw = pd.read_parquet(args.data)
    df, inspection = prepare_frame(raw)
    print(f"Rows after dedupe: {len(df)} of {len(raw)}")

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df[TARGET])
    label_names = [str(value) for value in label_encoder.classes_]
    X = df[FEATURES]

    X_train, X_holdout, y_train, y_holdout = train_test_split(
        X, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_holdout, y_holdout, test_size=0.50, random_state=RANDOM_STATE, stratify=y_holdout
    )
    print(f"train={len(X_train)} val={len(X_val)} test={len(X_test)}")

    candidates = {
        "random_forest": RandomForestClassifier(
            n_estimators=150,
            max_depth=16,
            min_samples_leaf=1,
            n_jobs=-1,
            random_state=RANDOM_STATE,
            class_weight="balanced_subsample",
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.15,
            subsample=0.9,
            random_state=RANDOM_STATE,
        ),
    }

    comparison = {}
    fitted = {}
    for name, estimator in candidates.items():
        pipeline = build_pipeline(estimator)
        fit_start = time.perf_counter()
        pipeline.fit(X_train, y_train)
        fit_seconds = time.perf_counter() - fit_start
        val = evaluate(name, pipeline, X_val, y_val, label_names)
        val["fit_seconds"] = round(fit_seconds, 2)
        export_bytes = len(export_onnx(pipeline).SerializeToString())
        val["onnx_export_bytes"] = export_bytes
        comparison[name] = {"validation": val}
        fitted[name] = pipeline
        print(
            f"{name}: val macro-F1={val['f1_macro']:.4f} accuracy={val['accuracy']:.4f} "
            f"onnx={export_bytes / 1024:.1f} KiB"
        )

    # Selection uses validation macro-F1. Candidates within 0.001 of the best are
    # considered equivalent; the smallest export wins on deployment footprint.
    best_score = max(item["validation"]["f1_macro"] for item in comparison.values())
    eligible = [
        name
        for name, item in comparison.items()
        if item["validation"]["f1_macro"] >= best_score - 0.001
    ]
    best_name = min(eligible, key=lambda key: comparison[key]["validation"]["onnx_export_bytes"])
    best_pipeline = fitted[best_name]
    print(f"Selected: {best_name}")

    # Refit the selected configuration on train+validation, keep test untouched.
    final_pipeline = build_pipeline(_clone_estimator(candidates[best_name]))
    X_fit = pd.concat([X_train, X_val])
    y_fit = np.concatenate([y_train, y_val])
    final_pipeline.fit(X_fit, y_fit)
    test_result = evaluate(best_name, final_pipeline, X_test, y_test, label_names)

    # Export the complete preprocessing + classifier pipeline to ONNX.
    onnx_model = export_onnx(final_pipeline)
    onnx_path = ARTIFACTS / "workout_recommendation.onnx"
    onnx_path.write_bytes(onnx_model.SerializeToString())
    print(f"ONNX written: {onnx_path} ({onnx_path.stat().st_size / 1024:.1f} KiB)")

    # Validate ONNX Runtime against the original pipeline.
    import onnxruntime as ort

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    schema = {
        "feature_order": FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "categorical_values": CATEGORICAL_VALUES,
        "derived_features": {
            "BMI": "Weight_kg / (Height_cm / 100)^2, computed before inference"
        },
        "onnx_inputs": [
            {"name": item.name, "shape": item.shape, "type": item.type} for item in inputs
        ],
        "onnx_outputs": [
            {"name": item.name, "shape": item.shape, "type": item.type}
            for item in session.get_outputs()
        ],
        "target_labels": label_names,
        "model_version": "1.0.0",
        "notes": "Inputs are raw values; one-hot encoding and scaling are inside the ONNX graph.",
    }

    sample_size = min(400, len(X_test))
    sample_index = np.random.RandomState(RANDOM_STATE).choice(len(X_test), sample_size, replace=False)
    sample = X_test.iloc[sample_index]
    pipeline_predictions = final_pipeline.predict(sample)
    pipeline_proba = final_pipeline.predict_proba(sample)

    feed = {}
    for feature in NUMERIC_FEATURES:
        feed[feature] = sample[feature].to_numpy(dtype=np.float32).reshape(-1, 1)
    for feature in CATEGORICAL_FEATURES:
        feed[feature] = sample[feature].to_numpy(dtype=object).reshape(-1, 1)

    latency_start = time.perf_counter()
    onnx_outputs = session.run(None, feed)
    onnx_seconds = time.perf_counter() - latency_start
    output_names = [item.name for item in session.get_outputs()]
    label_output = onnx_outputs[output_names.index("label")]
    proba_output = onnx_outputs[output_names.index("probabilities")]
    onnx_predictions = final_pipeline.classes_[np.asarray(label_output).astype(int)]

    agreement = float(np.mean(onnx_predictions == pipeline_predictions))
    if isinstance(proba_output, list):
        proba_output = np.asarray(proba_output)
    max_proba_delta = float(np.max(np.abs(np.asarray(proba_output) - pipeline_proba)))
    invalid_rejected = _invalid_case_test(session, feed, schema)

    onnx_validation = {
        "samples": int(sample_size),
        "label_agreement": agreement,
        "max_probability_delta": max_proba_delta,
        "onnx_batch_seconds": round(onnx_seconds, 4),
        "onnx_ms_per_sample": round(onnx_seconds * 1000 / sample_size, 4),
        "invalid_case_handling": invalid_rejected,
        "input_names": [item.name for item in inputs],
        "output_names": output_names,
    }
    print(f"ONNX agreement={agreement:.4f} max_delta={max_proba_delta:.8f}")

    metadata = {
        "modelVersion": "1.0.0",
        "modelType": best_name,
        "sklearnVersion": __import__("sklearn").__version__,
        "skl2onnxVersion": __import__("skl2onnx").__version__,
        "onnxRuntimeVersion": ort.__version__,
        "opset": 17,
        "trainedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "dataset": {
            "name": "Tomertg/SmartFit_Dataset",
            "license": "MIT (dataset card)",
            "sourceRows": int(len(raw)),
            "trainingRows": int(len(df)),
            "split": {"train": int(len(X_train)), "validation": int(len(X_val)), "test": int(len(X_test))},
            "randomSeed": RANDOM_STATE,
        },
        "selectedModelReason": (
            "Selected by validation macro-F1 (ties broken by higher accuracy, then smaller "
            "inference footprint). Test metrics below come from the refit pipeline."
        ),
        "validationSelection": {name: comparison[name]["validation"]["f1_macro"] for name in comparison},
        "testMetrics": {k: v for k, v in test_result.items() if k not in {"confusion_matrix"}},
        "testConfusionMatrix": test_result["confusion_matrix"],
    }

    (ARTIFACTS / "feature_schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
    (ARTIFACTS / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (ARTIFACTS / "model_classes.json").write_text(
        json.dumps({"classes": label_names}, indent=2), encoding="utf-8"
    )
    results = {
        "inspection": inspection,
        "comparison": comparison,
        "selected": best_name,
        "test": test_result,
        "onnxValidation": onnx_validation,
        "artifacts": {
            "onnx": str(onnx_path.relative_to(ROOT)),
            "onnxBytes": int(onnx_path.stat().st_size),
        },
    }
    (ARTIFACTS / "training_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("Artifacts written to", ARTIFACTS)


def _clone_estimator(estimator):
    from sklearn.base import clone

    return clone(estimator)


def _xgb_classifier(n_classes: int):
    """Retained for the comparison notebook; XGBoost needs onnxmltools to export."""
    from xgboost import XGBClassifier

    return XGBClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="multi:softprob",
        num_class=n_classes,
        tree_method="hist",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbosity=0,
    )


def _invalid_case_test(session, feed, schema) -> dict:
    """Feed schema-visible invalid rows and record runtime behaviour."""
    import numpy as np

    result = {}
    base = {key: value[:1].copy() for key, value in feed.items()}

    unknown = {key: value.copy() for key, value in base.items()}
    unknown["Goal"][0, 0] = "Not A Real Goal"
    try:
        session.run(None, unknown)
        result["unknown_category"] = "accepted (unknown categories encode to all-zero one-hot)"
    except Exception as error:  # pragma: no cover - runtime dependent
        result["unknown_category"] = f"rejected: {type(error).__name__}"

    empty = {key: value.copy() for key, value in base.items()}
    empty["Goal"][0, 0] = ""
    try:
        session.run(None, empty)
        result["empty_category"] = "accepted (encodes to all-zero one-hot)"
    except Exception as error:  # pragma: no cover
        result["empty_category"] = f"rejected: {type(error).__name__}"

    result["note"] = "Value-range validation happens in the API service before inference."
    result["featureOrder"] = schema["feature_order"]
    return result


if __name__ == "__main__":
    main()
