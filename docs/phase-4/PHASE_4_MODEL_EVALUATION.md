# Phase 4 — Model Evaluation

**Project:** Forge Athletic  
**Models evaluated:** squat, bicep curl, push-up form classifiers; workout plan classifier  
**Evaluation type:** offline, held-out data, deployed ONNX artifacts  
**Official artifacts:** `public/models/evaluation_report.json`, `ml/reports/phase4_evaluation.json`  
**Date:** 25 November 2026

---

## 1. Purpose and constraints

Phase 4 needed a reproducible answer to a narrow question:

> How well do the exact ONNX files that ship to members perform on data that was not used to fit them?

Constraints:

- Do not retrain, replace, or re-export a deployed model.
- Do not change thresholds or model input contracts.
- Do not send member data to a hosted evaluation service.
- Do not accept evaluation metrics from a browser or Firestore.
- Do not present a synthetic ceiling as real-world generalisation.

The result is a repository script that reads stored features, runs the deployed ONNX graphs through ONNX Runtime, and writes a static report. The admin dashboard only reads that report.

---

## 2. Artifacts evaluated

| Model | File | SHA-256 | Size | Threshold |
| --- | --- | --- | --- | --- |
| Squat form classifier | `form_classifier_squat.onnx` | `84a84bc130159a40…` | 373,668 B | 0.66 |
| Bicep curl form classifier | `form_classifier_bicep_curl.onnx` | `23bfeb8495b9e942…` | 373,780 B | 0.64 |
| Push-up form classifier | `form_classifier_push_up.onnx` | `18fb7cde7ac4d747…` | 340,970 B | 0.58 |
| Workout plan classifier | `workout_recommendation.onnx` | `cf256da022384875…` | 1,617,299 B | n/a |

The script hashes each artifact and records the hash and size in the report. If a model file changes, the report must be regenerated and the hash will change.

---

## 3. Evaluation environment

| Item | Version |
| --- | --- |
| Python | 3.13.5 |
| Platform | Windows 11 (10.0.26300) |
| onnxruntime | 1.32.0 |
| NumPy | 2.5.5 |
| pandas | 3.1.1 |
| CPU | Local CPU execution provider |

The browser uses the same ONNX graphs through `onnxruntime-web` WASM. CPU batch timings are not browser timings and are reported separately from live latency.

---

## 4. Form classifier methodology

### 4.1 Data

| Property | Value |
| --- | --- |
| Source | Forge form dataset stored as feature extracts |
| Videos | 444 |
| Windows | 22,662 (2.0 s window, 0.5 s stride) |
| Participants | 25 squat, 25 bicep curl, 24 push-up |
| Mean pose detection | 0.9831 |
| Evaluation unit | One 2-second clip per held-out video (exercise set) |
| Test participants | `001`, `009`, `017`, `024` |
| Validation participants | `002`, `010`, `012`, `014` |
| Training participants | 17 others |

The shipped model was refit on training + validation participants. Test participants were never used for fit or threshold selection.

### 4.2 Feature reconstruction

The deployed model expects a 60-feature clip vector. The repository stores clip features (56 columns) and rep features (21 columns). The script:

1. Reads `ml/reports/clip_features.parquet` and `ml/reports/rep_features.parquet`.
2. Merges on `video_id` one-to-one.
3. Uses the feature order from `public/models/model_metadata.json`.
4. Fills the 60 expected features from the clip and rep extracts.
5. Asserts that no required feature is missing.

This reconstructs the same input the browser builds, without storing raw video.

### 4.3 Inference and threshold

For each exercise:

1. Load the exact `public/models/form_classifier_<exercise>.onnx`.
2. Run the test-participant rows in one batch.
3. Read the probability output for class `GOOD`.
4. Apply the shipped threshold: squat `0.66`, bicep `0.64`, push-up `0.58`.
5. Compute accuracy, precision, recall, F1, ROC-AUC, confusion matrix, false-accept rate and false-reject rate.

`GOOD` is the positive class. A false accept is a bad clip classified as good; a false reject is a good clip classified as bad.

---

## 5. Form classifier results

### 5.1 Summary

| Model | n | Accuracy | Precision | Recall | F1 | ROC-AUC | False accept | False reject |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Squat | 24 | 0.5417 | 0.6667 | 0.1667 | 0.2667 | 0.7292 | 0.0833 | 0.8333 |
| Bicep curl | 24 | 0.4167 | 0.2500 | 0.0833 | 0.1250 | 0.3681 | 0.2500 | 0.9167 |
| Push-up | 24 | 0.6667 | 0.6667 | 0.6667 | 0.6667 | 0.7222 | 0.3333 | 0.3333 |

### 5.2 Confusion matrices

Rows are actual; columns are predicted. `TN` = bad correctly rejected, `FP` = bad accepted as good, `FN` = good rejected as bad, `TP` = good correctly accepted.

| Model | TN | FP | FN | TP |
| --- | --- | --- | --- | --- |
| Squat | 11 | 1 | 10 | 2 |
| Bicep curl | 9 | 3 | 11 | 1 |
| Push-up | 8 | 4 | 4 | 8 |

### 5.3 Interpretation

- **Squat** is conservative: only 1 of 12 bad clips was accepted, but 10 of 12 good clips were rejected. The high false-reject rate means the score is more useful as a caution signal than as a reliable good-form confirmation.
- **Bicep curl** performs below chance on this test set (ROC-AUC 0.3681). The model is not reliable for held-out participants at the shipped threshold. This is a real result, not a display bug.
- **Push-up** is the strongest of the three, with balanced errors (4 false accepts, 4 false rejects) and F1 0.6667, but 24 clips is a small sample.
- Accuracy alone is misleading because the test set is balanced 12 good / 12 bad. Precision and recall are more informative.

These results are consistent with the Phase 2/3 observation that the form classifiers are weak generalisers. Phase 4 did not tune them to make the dashboard look better.

### 5.4 Historical baseline and artifact drift

The stored report `ml/reports/final_metrics.json` records the earlier model measured on the test participants:

| Model | Stored accuracy | Stored F1 | Stored ROC-AUC | Deployed accuracy | Deployed F1 | Deployed ROC-AUC |
| --- | --- | --- | --- | --- | --- | --- |
| Squat | 0.5000 | 0.2500 | 0.6528 | 0.5417 | 0.2667 | 0.7292 |
| Bicep curl | 0.5000 | 0.1429 | 0.4306 | 0.4167 | 0.1250 | 0.3681 |
| Push-up | 0.6250 | 0.6087 | 0.7361 | 0.6667 | 0.6667 | 0.7222 |

The stored numbers were measured on a model fitted on training participants only. The shipped artifact was refit on training + validation participants after that measurement. Therefore the deployed scores cannot equal the stored ones by construction.

The report marks these rows as `artifact-drift`, not as a regression. The dashboard shows the deployed score and the delta for audit, with an explicit explanation. It does not claim the delta is caused by a code change.

---

## 6. Workout plan classifier methodology

### 6.1 Data

| Property | Value |
| --- | --- |
| Dataset | SmartFit synthetic workout-plan dataset |
| Source records | 10,000 |
| Rows after dedupe | 9,509 |
| Test samples | 1,427 |
| Classes | 24 plan categories |
| Split | Stratified 70% train / 15% validation / 15% test, seed 42 |
| Features | Age, weight, height, BMI, gender, goal, equipment, experience, injury |

### 6.2 Method

1. Load the same CSV/parquet used by the training script.
2. Recreate the stratified split with `random_state=42`.
3. Encode categorical fields with the stored label encoder contract.
4. Run `public/models/workout_recommendation.onnx` on the 1,427 test rows.
5. Compare argmax predictions with the held-out labels.
6. Record accuracy, macro precision/recall/F1, weighted F1, label agreement, and per-class metrics.

The evaluation uses the deployed ONNX graph. It does not import the training model object.

---

## 7. Workout plan classifier results

| Metric | Value |
| --- | --- |
| Test samples | 1,427 |
| Classes | 24 |
| Accuracy | 1.0000 |
| Macro precision | 1.0000 |
| Macro recall | 1.0000 |
| Macro F1 | 1.0000 |
| Weighted F1 | 1.0000 |
| Label agreement | 1.0000 |
| Stored reference accuracy | 1.0000 |
| Reproduction status | `exact` |

All 24 per-class precision/recall/F1 values are 1.0000. Support ranges from 10 (`Advanced Calisthenics`) to 209 (`Seated Upper Body Strength & Rowing`).

### 7.1 What this result means

The SmartFit dataset has a deterministic feature-to-plan mapping. A model can learn that mapping perfectly. The 1.0000 score proves that the deployed artifact reproduces the synthetic label rule on the synthetic test split.

It does **not** prove that the recommended plan is safe, appropriate, or effective for a real athlete. No real member outcomes, injuries, adherence, or coach review were part of this evaluation.

The report labels this as a synthetic ceiling in both the dataset description and the limitations.

---

## 8. Reproducibility

### 8.1 Commands

```powershell
cd "F:\Fitness Coach"
npm run eval:models
npm run eval:models:check
```

`eval:models` regenerates both reports. `eval:models:check` recomputes metrics and hashes and compares them with the previously committed report.

The npm scripts use the Windows virtual-environment path with backslashes:

```text
workout-recommendation\.venv\Scripts\python.exe scripts/evaluate-models.py
```

An earlier forward-slash version failed under `cmd.exe`; this was fixed and re-verified.

### 8.2 Check output

```text
Model                            Samples  Accuracy       F1  Matches
--------------------------------------------------------------------
Squat form classifier                 24    0.5417   0.2667    False
Bicep Curl form classifier            24    0.4167   0.1250    False
Push Up form classifier               24    0.6667   0.6667    False
Workout plan category classifier    1427    1.0000   1.0000     True

CHECK OK: metrics and artifact hashes match the previous report
```

`Matches` compares the deployed artifact with the **historical stored baseline**, so `False` is expected for the form models and is the artifact-drift signal. `CHECK OK` means the new run matches the **official Phase 4 report** exactly (or within rounding), including model hashes.

### 8.3 Determinism controls

- Fixed test participant list.
- Fixed feature order from metadata.
- Fixed threshold per exercise.
- Fixed recommendation split seed 42.
- CPU execution provider.
- Model SHA-256 recorded in the report.

Small last-digit differences can occur across ONNX Runtime versions or CPU backends. The check uses a 0.0001 tolerance on metrics and exact hashes on artifacts.

---

## 9. Threats to validity

| Threat | Impact | Mitigation / status |
| --- | --- | --- |
| Only 24 test clips per form exercise | Wide confidence intervals; one clip changes accuracy by 4.2 points | Reported openly; do not over-interpret |
| Clip-level, not video-level, evaluation | Does not measure full-set tracking stability | Stated limitation; raw videos unavailable |
| No raw window dataset in repo | Cannot recompute window-level metrics | Stored feature extracts used |
| Form test subjects may appear in stored training artifacts | Possible leakage if participant split is wrong | Split is fixed in `final_metrics.json`; claimed held-out |
| Bicep ROC-AUC below 0.5 | Model may be anti-correlated on this split | Reported honestly; no tuning to hide it |
| Synthetic recommendation data | 1.0000 is not real-world accuracy | Labelled synthetic ceiling |
| CPU timing vs browser WASM | Offline latency not equal to member latency | Live latency measured separately in monitoring |
| Artifact drift | Stored baseline not reproducible from deployed file | Labelled `artifact-drift`; deployed score shown |

---

## 10. What was not done

- No model retraining.
- No threshold optimisation.
- No new features or architecture changes.
- No real-world outcome study.
- No per-member fairness analysis (age, sex, body type, disability).
- No video-level tracking evaluation.
- No confidence calibration analysis.

These are legitimate future work items, but they require approval and data beyond Phase 4's additive scope.

---

## 11. Admin presentation

The Model Monitoring page shows:

- Deployed artifact name, version, hash prefix, size, threshold, availability.
- Test n, accuracy, F1, ROC-AUC, delta vs historical baseline.
- Dataset description and participant count.
- Explicit artifact-drift explanation.
- Generation provenance and regeneration command.

The page does not let an admin edit metrics. There is no Firestore collection for evaluation results, so a compromised client cannot submit a better score.

---

## 12. Related documents

- [Audit Report](./PHASE_4_AUDIT_REPORT.md)
- [Architecture](./PHASE_4_ARCHITECTURE.md)
- [Database Schema](./PHASE_4_DATABASE_SCHEMA.md)
- [AI Monitoring](./PHASE_4_AI_MONITORING.md)
- [Security Report](./PHASE_4_SECURITY_REPORT.md)
- [Test Report](./PHASE_4_TEST_REPORT.md)