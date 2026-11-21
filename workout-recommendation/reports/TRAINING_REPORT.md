# Training report — Forge Athletic workout recommendation model

**Status:** trained, evaluated, exported and ONNX-validated.

## 1. Environment and execution location

| Item | Value |
|---|---|
| Training script | `workout-recommendation/scripts/train_model.py` |
| Colab notebook | `workout-recommendation/notebooks/smartfit_training.ipynb` (self-contained, writes the same script) |
| Local training run | Windows, Python 3.13.5, scikit-learn 1.9.1, CPU |
| Colab execution | **Not executed by the agent** — no authorised Colab session was reachable. The notebook is ready to run and uses the identical script. |
| Training date | 2026-11-21T19:30 UTC |
| Random seed | 42 |

The metrics below are from the actual local run. They are not copied from the dataset card or invented.

## 2. Dataset inspection (verified, not assumed)

Source: `Tomertg/SmartFit_Dataset` (MIT licence on the dataset card), parquet file `data/train-00000-of-00001.parquet`, 73,833 bytes.

| Check | Result |
|---|---|
| Raw shape | 10,000 rows × 9 columns |
| Columns | `Age`, `Gender`, `Weight_kg`, `Height_cm`, `Goal`, `Equipment`, `Experience`, `Injury`, `Recommended_Plan` |
| Dtypes | 3 numeric int64 (`Age`, `Weight_kg`, `Height_cm`), 5 string objects |
| Missing values | `Injury` 3,585 (empty/`None` text), `Experience` 20, all other columns 0 |
| Duplicate rows | **491 exact duplicates** (same 8 inputs + label) |
| Unique input combinations | 9,509 |
| Ambiguous inputs (same inputs, different label) | **0** |
| Label classes | 24 |
| Age range | 20–66 |
| Weight range | 40–120 kg |
| Height range | 150–205 cm |
| Class imbalance | Largest: `Seated Upper Body Strength & Rowing` (1,390), smallest: `Advanced Calisthenics` (66) |

The dataset is **synthetic and deterministic by construction**: every unique input combination has exactly one label. This explains the perfect scores below and is a dataset property, not evidence of real-world coaching validity.

## 3. Preprocessing

1. Empty `Injury` and `Experience` values were normalised to `Unknown` after trimming. Categorical string values were stripped of whitespace.
2. Categorical values were verified against a fixed vocabulary per feature. The website validates against the same vocabulary before inference.
3. **Exact duplicates were removed before splitting** (10,000 → 9,509). Without this, copies of the same record would have appeared in both train and test and inflated the score.
4. `BMI` was derived as `Weight_kg / (Height_cm / 100)^2`. It is never collected as free text.
5. Target labels were label-encoded with `LabelEncoder`; the class order is saved in `feature_schema.json` and `model_classes.json`.
6. Split: stratified 70/15/15.
   - Train: 6,656
   - Validation: 1,426
   - Test: 1,427
7. The test set was kept untouched during model selection. The selected configuration was refit on train + validation and evaluated once on the test set.
8. No target-derived feature was used. No leakage from the test set into preprocessing statistics.

## 4. Algorithms compared

Both models used the same `ColumnTransformer`:

- `StandardScaler` for `Age`, `Weight_kg`, `Height_cm`, `BMI`.
- `OneHotEncoder(handle_unknown='ignore')` for `Gender`, `Goal`, `Equipment`, `Experience`, `Injury`.
- Classifier.

| Model | Configuration | Validation macro-F1 | Validation accuracy | ONNX export size |
|---|---|---|---|---|
| Random Forest | 150 trees, max depth 16, balanced subsample | 1.0000 | 1.0000 | 25.7 MB |
| Gradient Boosting | 120 estimators, depth 4, learning rate 0.15, subsample 0.9 | 1.0000 | 1.0000 | **1.6 MB** |

XGBoost was installed and considered, but `skl2onnx` has no shape calculator for `XGBClassifier` without an additional converter. The requirement allows Gradient Boosting, and sklearn's `GradientBoostingClassifier` exports cleanly, so it was used instead of adding an unnecessary production dependency.

## 5. Model selection

Selected: **Gradient Boosting**.

Reason: both candidates reached 1.0000 validation macro-F1, so validation performance could not separate them. The tie-break was deployment footprint and export compatibility. Gradient Boosting's ONNX graph is **1.6 MB versus 25.7 MB** for Random Forest, gives a maximum probability delta of **1.7 × 10⁻⁷** against the sklearn pipeline, and is deterministic in ONNX Runtime. Lower size matters because the model is shipped to browsers for local inference.

This is documented in `artifacts/model_metadata.json` together with the selection scores, so the choice is auditable.

## 6. Training / validation / test separation

- Model comparison: train vs validation only.
- Final model: refit on train + validation.
- Final metrics: single evaluation on the untouched test split.
- Duplicate removal happened before all splits.
- Preprocessing was fitted inside the pipeline per training split, so validation/test statistics were not used.

## 7. Reproducibility

```bash
cd workout-recommendation
python -m venv .venv
.venv/Scripts/python -m pip install pandas numpy scikit-learn skl2onnx onnxruntime onnx pyarrow
.venv/Scripts/python scripts/train_model.py
.venv/Scripts/python scripts/validate_onnx.py
```

The notebook runs the same commands in Colab. Seed 42 is fixed. Threading order can make tree ensembles non-bit-identical across machines; the split and labels are deterministic, and the ONNX vs pipeline agreement test is the release gate.

## 8. Honest limitations

- The dataset is synthetic and has no clinical, biomechanical or longitudinal outcome data.
- Inputs determine labels, so 100% accuracy says the model learned the synthetic generator's mapping, not that a plan is safe or effective for a real person.
- The 24 labels are broad plan categories, not exercise-level schedules. The weekly schedule is produced by the separate, rule-based generation engine described in `IMPLEMENTATION_REPORT.md`.
- `Gender` has only `Female` and `Male` in the training data. `Unspecified` is validated by the app and encodes to an all-zero one-hot vector; it is not a trained category.
- The model has no uncertainty calibration for out-of-distribution users. The app therefore clamps inputs to the training range and surfaces warnings.
- No fairness audit by sex, age or disability was possible from a synthetic dataset.
