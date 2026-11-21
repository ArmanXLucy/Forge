# AI workout recommendation — Forge Athletic

A personalised 7-day workout plan feature for the existing Forge Athletic React/Firebase app.

- **Model:** scikit-learn Gradient Boosting over the SmartFit dataset (24 plan categories).
- **Runtime:** ONNX Runtime Web, running in the browser.
- **Plan engine:** deterministic, rule-based 7-day schedule with an 80+ exercise library, equipment filtering, injury contraindications and volume caps.
- **Unlock rule:** visible from day one, but generation is gated on persisted, validated answers for all seven missions.
- **Persistence:** `users/{uid}/mission_answers/*` and `users/{uid}/workout_recommendations/*` in the existing Firestore, with localStorage fallback.

## Run

```bash
npm install
npm run dev      # copies the ONNX artifact + schema to public/models
```

Open `/dashboard/workout-recommendation`. The dashboard and My Workout Plans show a spotlight card as well.

## Test

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

## Train / validate the model

```bash
cd workout-recommendation
python -m venv .venv
.venv/Scripts/python -m pip install pandas numpy scikit-learn skl2onnx onnxruntime onnx pyarrow
.venv/Scripts/python scripts/train_model.py
.venv/Scripts/python scripts/validate_onnx.py
```

Or run `notebooks/smartfit_training.ipynb` in Colab. The notebook writes and runs the same scripts.

## Structure

```
workout-recommendation/
  artifacts/     ONNX model, feature schema, metadata, validation output
  notebooks/     Colab-ready training notebook
  reports/       training, evaluation, implementation and test reports
  scripts/       training and validation scripts
src/features/workout-recommendation/
  data/          plan catalog, exercise library, persistence
  lib/           model mapping, ONNX inference, generator, validator
  components/    7-day schedule, dashboard spotlight
  hooks/         readiness/generation hook
src/pages/Dashboard/WorkoutRecommendationPage.tsx
src/store/useRecommendationStore.ts
```

## Production notes

- Deploy `firestore.rules`.
- The browser loads the ONNX Runtime WASM glue from the version-pinned jsDelivr CDN; the ONNX model itself is served from `/models/workout_recommendation.onnx`.
- Read `reports/IMPLEMENTATION_REPORT.md §18` before launch: server-side enforcement, Firestore rule tests and a real-account smoke test are still required.
