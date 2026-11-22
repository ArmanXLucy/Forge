# Phase 2 — AI Performance Report

**Date:** 2026-11-23  
**Environment:** Windows, Node 22.16.0, Chrome 157 headless, local production build  
**AI model behavior changed:** No  
**Model files changed:** No

Measurements are real observations from this machine. They are not promises for mobile devices or production networks.

---

## 1. What was tested

A production Vite build was served locally through `vite preview`. Because no test Firebase account was available, the full AI path was exercised in a second production build with Firebase variables intentionally blank, allowing the existing demo workspace. The AI code, model assets, runtime versions, and build pipeline are identical.

| Path | Result |
|---|---|
| Recommendation page load | Ready in ~1.8 s |
| Recommendation generation | Succeeded in 527 ms |
| Recommendation model fetch | `/models/workout_recommendation.onnx` HTTP 200 |
| Recommendation runtime | ORT 1.31.1 JS + WASM HTTP 200 |
| AI Coach page load | Ready |
| Camera start | `Camera live` |
| Pose runtime | MediaPipe 0.10.14 HTTP 200 |
| Form runtimes | All 3 classifiers + ORT 1.19.2 HTTP 200 |
| Console errors | None |
| Mobile viewport | 390 px, no horizontal overflow |

---

## 2. Production output optimization

### Before

| Output | Size |
|---|---:|
| `dist/` total | ~28 MB |
| Unused ORT WASM | 14.8 MB |
| Inference chunk | 80.63 KB (27.17 KB gzip) |

### After

| Output | Size |
|---|---:|
| `dist/` total | **~13 MB** |
| Unused ORT WASM | **0** |
| Inference chunk | 57.17 KB (18.54 KB gzip) |
| Build time | 19–25 s |

The change is a Vite resolve condition selecting ONNX Runtime's external-WASM export. `ort.env.wasm.wasmPaths` already pointed to the pinned CDN. Runtime verification confirmed inference still succeeds.

**No model, preprocessing, threshold, feature, output, or category changes were made.**

---

## 3. Recommendation timing

Measured from navigation/click in the local production preview:

| Phase | Observation |
|---|---:|
| Page ready for “Generate plan” | 1,816 ms |
| Click → rendered AI recommendation | 527 ms |
| Browser-reported model inference | 16 ms |
| Model confidence for fixture | 1.0 |
| ONNX model request duration | 371 ms (first run) |
| ORT 1.31.1 JS request | 220 ms |
| ORT 1.31.1 WASM request | 691 ms |
| Browser-reported model transfer | 97,050 bytes (compressed) |
| Browser-reported ORT WASM transfer | 3,195,570 bytes |

The plan was `Push-Pull-Legs Split (Hypertrophy)`, with a valid seven-day schedule, 3 training days, and a 100% confidence return. The saved plan recorded `modelSource: 'onnx-web'`, `modelVersion: '1.0.0'`, `inferenceMs: 16`.

The 16 ms browser inference includes ONNX Runtime session execution overhead; the Phase 1 Python validation measured 0.144 ms CPU per sample on desktop. These are different runtimes and should not be compared directly.

---

## 4. AI Coach timing and resources

AI Coach loads on first camera/video session, not on dashboard load.

| Resource | Browser transfer | Request duration |
|---|---:|---:|
| Metadata | ~1 KB | 19 ms |
| ORT 1.19.2 `ort.min.mjs` | 86,435 B | 218 ms |
| ORT 1.19.2 WASM | 1,886,505 B | 1,283 ms |
| Squat classifier | 48,985 B | 56 ms |
| Bicep curl classifier | 48,872 B | 132 ms |
| Push-up classifier | 43,911 B | 120 ms |
| MediaPipe vision bundle | 34,101 B | 80 ms |
| MediaPipe WASM JS | 45,605 B | 103 ms |
| MediaPipe WASM binary | 2,005,751 B | 773 ms |
| Pose Landmarker model | 9,398,198 B content-length | 4,064 ms |

Total camera-to-live time was not instrumented precisely; it completed within the 120-second test timeout and reached `Camera live`. The pose model is the slowest individual resource. The fixture camera feed contains no human pose, so the test reached “Finding pose” but could not produce GOOD/BAD scores or reps.

**Not tested:** real human movement, rep counting, score generation, session save on a real camera.

---

## 5. Memory observation

On the AI Coach page after models and camera were active, headless Chrome reported:

- `performance.memory.usedJSHeapSize`: 26,165,812 bytes (~26 MB)
- `performance.memory.totalJSHeapSize`: 27,897,604 bytes (~28 MB)
- CDP `Runtime.getHeapUsage().usedSize`: 14,223,468 bytes (~14 MB)
- CDP total heap: 15,990,784 bytes (~16 MB)

These are single desktop headless observations, not a memory profile, and do not include WASM/GPU memory or mobile behavior. No leak test was performed. The existing code caps stored frames, revokes object URLs, stops camera tracks, cancels animation frames, and reuses the pose landmarker.

---

## 6. Optimizations implemented

1. **Removed unused bundled ORT WASM** through a Vite resolve condition.
2. **Added deterministic asset verification** before/after build (`scripts/verify-model-assets.mjs`).
3. **Added model contract tests** (24 labels, 9/2 tensors, 60 features, thresholds, hashes).
4. **Preserved lazy loading**:
   - Recommendation inference module is dynamically imported during generation.
   - AI Coach models load only when a camera/video session starts.
5. **Preserved CDN WASM usage** with exact version pinning.
6. **Improved failure messages**:
   - Recommendation now states WebAssembly support and deployment checks.
   - AI Coach maps WASM/ONNX/MediaPipe failures to a clear browser/model message.
7. **No Web Worker added**: recommendation inference is ~16 ms in-browser, so worker overhead is not justified; MediaPipe must run its own runtime.

---

## 7. Remaining limitations

- Pose model is a 9.4 MB download and uses a mutable `/latest/` URL.
- AI Coach depends on two CDNs and one Google model host at first use.
- No model service worker/offline cache.
- No retry UI beyond re-clicking Start/Generate; failed load promises reset, so retry works.
- No mobile hardware measurements.
- No real-camera GOOD/BAD scoring or rep-count test in this phase.
- No memory profiling on low-end devices.
- No integrity verification for remote ESM/WASM/model assets.
- Main JS chunk remains ~512 KB minified (existing warning).
- The 2.1 MB diagnostic fixture still ships in `public/`.
- Cold CDN cache can make first AI Coach initialization slower than these warm local results.

---

## 8. Conclusion

Both AI systems continue to run entirely in the browser. The production output is roughly 15 MB smaller without changing inference behavior. Recommendation generation is sub-second after page load on this desktop; AI Coach model initialization is dominated by the 9.4 MB pose model. Mobile performance remains unverified on physical hardware.

<!-- phase2-ai-performance-report-complete -->
