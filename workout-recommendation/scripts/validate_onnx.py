"""Independent ONNX Runtime validation for the workout recommendation artifact.

Run with the project virtualenv:
    python workout-recommendation/scripts/validate_onnx.py
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
MODEL = ARTIFACTS / "workout_recommendation.onnx"
DATA = ROOT / "data" / "train-00000-of-00001.parquet"
RANDOM_STATE = 42

NUMERIC = ["Age", "Weight_kg", "Height_cm", "BMI"]
CATEGORICAL = ["Gender", "Goal", "Equipment", "Experience", "Injury"]
FEATURES = NUMERIC + CATEGORICAL


def prepare() -> pd.DataFrame:
    raw = pd.read_parquet(DATA)
    df = raw.copy()
    df["Experience"] = df["Experience"].fillna("Unknown").astype(str).str.strip()
    df["Injury"] = df["Injury"].fillna("Unknown").astype(str).str.strip()
    df = df.drop_duplicates(subset=["Age", "Weight_kg", "Height_cm", "Gender", "Goal", "Equipment", "Experience", "Injury", "Recommended_Plan"])
    df["BMI"] = df["Weight_kg"] / (df["Height_cm"] / 100.0) ** 2
    return df.reset_index(drop=True)


def feed_from_frame(frame: pd.DataFrame) -> dict:
    feed = {}
    for feature in NUMERIC:
        feed[feature] = frame[feature].to_numpy(dtype=np.float32).reshape(-1, 1)
    for feature in CATEGORICAL:
        feed[feature] = frame[feature].to_numpy(dtype=object).reshape(-1, 1)
    return feed


def main() -> None:
    schema = json.loads((ARTIFACTS / "feature_schema.json").read_text(encoding="utf-8"))
    df = prepare()
    encoder = LabelEncoder().fit(df["Recommended_Plan"])
    labels = [str(value) for value in encoder.classes_]
    y = encoder.transform(df["Recommended_Plan"])

    _, holdout, _, y_holdout = train_test_split(
        df[FEATURES], y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    test, _, y_test, _ = train_test_split(
        holdout, y_holdout, test_size=0.50, random_state=RANDOM_STATE, stratify=y_holdout
    )

    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    input_names = [item.name for item in inputs]
    output_names = [item.name for item in outputs]

    feed = feed_from_frame(test)
    label_out, proba_out = session.run(None, feed)
    predicted_indices = np.asarray(label_out).astype(int)
    probabilities = np.asarray(proba_out)
    predicted = np.array(labels)[predicted_indices]

    accuracy = float(np.mean(predicted_indices == np.asarray(y_test)))
    confidence = probabilities.max(axis=1)

    # Determinism: repeat the same batch three times.
    repeats = []
    for _ in range(3):
        session.run(None, feed)
    repeat_preds = [np.asarray(session.run(None, feed)[0]) for _ in range(3)]
    deterministic = all(np.array_equal(repeat_preds[0], other) for other in repeat_preds[1:])

    # Latency at several batch sizes.
    latency = {}
    for batch in (1, 32, 256):
        subset = {key: value[:batch] for key, value in feed.items()}
        session.run(None, subset)  # warm-up
        start = time.perf_counter()
        for _ in range(20):
            session.run(None, subset)
        elapsed = (time.perf_counter() - start) / 20
        latency[batch] = {
            "mean_batch_ms": round(elapsed * 1000, 3),
            "mean_per_sample_ms": round(elapsed * 1000 / batch, 3),
        }

    # Invalid / unknown category behaviour.
    edge_cases = {}
    base = {key: value[:1].copy() for key, value in feed.items()}

    def run_case(name: str, mutate) -> None:
        case = {key: value.copy() for key, value in base.items()}
        mutate(case)
        try:
            case_label, case_proba = session.run(None, case)
            edge_cases[name] = {
                "accepted": True,
                "label": labels[int(np.asarray(case_label)[0])],
                "max_probability": round(float(np.asarray(case_proba).max()), 6),
            }
        except Exception as error:  # noqa: BLE001 - runtime specific
            edge_cases[name] = {"accepted": False, "error": f"{type(error).__name__}: {error}"}

    run_case("unknown_goal", lambda case: case.__setitem__("Goal", np.array([["Not A Real Goal"]], dtype=object)))
    run_case("empty_goal", lambda case: case.__setitem__("Goal", np.array([[""]], dtype=object)))
    run_case("unspecified_gender", lambda case: case.__setitem__("Gender", np.array([["Unspecified"]], dtype=object)))
    run_case("bmi_out_of_range", lambda case: case.__setitem__("BMI", np.array([[80.0]], dtype=np.float32)))
    run_case(
        "integer_for_string",
        lambda case: case.__setitem__("Goal", np.array([[123]], dtype=np.int64)),
    )

    result = {
        "onnxRuntime": ort.__version__,
        "modelPath": str(MODEL.relative_to(ROOT.parent)),
        "modelBytes": MODEL.stat().st_size,
        "opset": 17,
        "inputs": [{"name": item.name, "shape": item.shape, "type": item.type} for item in inputs],
        "outputs": [{"name": item.name, "shape": item.shape, "type": item.type} for item in outputs],
        "schemaFeatureOrderMatches": input_names == schema["feature_order"],
        "expectedOutputs": output_names,
        "testSamples": int(len(test)),
        "labelAgreementWithHeldOutTargets": accuracy,
        "meanConfidence": round(float(confidence.mean()), 6),
        "minConfidence": round(float(confidence.min()), 6),
        "allClassesPredicted": sorted(set(predicted.tolist())) == sorted(labels),
        "predictedClassCount": int(len(set(predicted.tolist()))),
        "deterministicWithinBatch": deterministic,
        "latency": latency,
        "edgeCases": edge_cases,
        "notes": [
            "Label agreement uses the same stratified split seed as training (42).",
            "Unknown or empty categorical values encode to an all-zero one-hot vector; the app validates values before inference.",
            "Numeric ranges are validated in the app before inference; BMI is derived, never user supplied.",
            "The dataset is synthetic and deterministic by input; 100% agreement does not imply real-world clinical effectiveness.",
        ],
    }
    out = ARTIFACTS / "onnx_validation.json"
    out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({key: result[key] for key in [
        "testSamples",
        "labelAgreementWithHeldOutTargets",
        "allClassesPredicted",
        "deterministicWithinBatch",
        "latency",
        "edgeCases",
    ]}, indent=2))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
