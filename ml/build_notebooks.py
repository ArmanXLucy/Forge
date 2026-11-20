"""
build_notebooks.py
==================
Generates the Colab notebook set (01..07) in ./notebooks from a single source of
truth, so the notebooks and the ml/*.py modules cannot drift apart.

Run locally:  python ml/build_notebooks.py
Then upload each notebook to Colab, or open with "File > Upload notebook".
"""

from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "notebooks")
os.makedirs(OUT, exist_ok=True)

SETUP_MD = """## Shared setup (run first)

This notebook uses the modules in `ml/`. Upload them once to the Colab runtime:

1. Click the folder icon in the left sidebar (Files).
2. Click **Upload to session storage** and select `extract_pose.py`,
   `fitness_features.py`, `build_dataset.py`, `train_baseline.py`,
   `train_temporal.py`, `export_onnx.py` from `F:\\Fitness Coach\\ml`.
3. Run the cell below.

The dataset zip is expected at
`/content/drive/MyDrive/Dataset Exercise Quality-wise.zip` (Google Drive).
"""

SETUP_CODE = r'''import os, sys, subprocess, json, glob
from pathlib import Path

ROOT = Path('/content/fitness')
ROOT.mkdir(parents=True, exist_ok=True)

# The uploaded modules land in /content; mirror them into the work root.
for f in ['extract_pose.py', 'fitness_features.py', 'build_dataset.py', 'train_baseline.py',
          'experiment_generalization.py', 'experiment_clip.py', 'experiment_repmetry.py',
          'train_final.py', 'train_temporal.py', 'export_onnx.py']:
    src = Path('/content') / f
    if src.exists():
        dst = ROOT / f
        if not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
            dst.write_bytes(src.read_bytes())

sys.path.insert(0, str(ROOT))
print('work root :', ROOT)
print('modules   :', sorted(p.name for p in ROOT.glob('*.py')))
print('cuda      :', subprocess.run('nvidia-smi -L', shell=True, capture_output=True, text=True).stdout.strip() or 'no GPU')
'''

DRIVE_CODE = r'''from google.colab import drive
drive.mount('/content/drive')
ZIP = '/content/drive/MyDrive/Dataset Exercise Quality-wise.zip'
import os
print('zip found:', os.path.exists(ZIP), round(os.path.getsize(ZIP)/1e9, 2), 'GB')
'''


def md(src: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": src.strip("\n").splitlines(keepends=True)}


def code(src: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": src.strip("\n").splitlines(keepends=True),
    }


def notebook(cells: list[dict], title: str = "") -> dict:
    return {
        "cells": cells,
        "metadata": {
            "colab": {"provenance": [], "toc_visible": True, "gpuType": "T4"},
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 0,
    }


def write(name: str, nb: dict) -> None:
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, indent=1)
    print("wrote", path)


# ---------------------------------------------------------------------------
# 01 - dataset inspection
# ---------------------------------------------------------------------------
nb01 = notebook([
    md("""# 01 · Dataset inspection

Goal: understand the archive **before** training, and confirm it preserves
exercise, quality label, participant id and camera view.

Dataset: Mendeley *Multi-View Raw Video Dataset*, version 3
(`Dataset Exercise Quality-wise.zip`, CC BY 4.0).

Nothing is extracted permanently here - the zip is read as an archive so the
inspection is fast."""),
    md(SETUP_MD), code(SETUP_CODE),
    md("## 1. Mount Drive and locate the archive"), code(DRIVE_CODE),
    md("## 2. List the archive and infer the folder schema"), code(r'''import zipfile, collections, os, re
z = zipfile.ZipFile(ZIP)
names = z.namelist()
files = [n for n in names if not n.endswith('/')]
print('entries:', len(names), '| files:', len(files))
print('extensions:', collections.Counter(os.path.splitext(n)[1].lower() for n in files).most_common())
print()
print('--- raw sample (first 12 entries) ---')
for n in names[:12]:
    print(' ', n)
print()
depths = collections.Counter(n.count('/') for n in names)
print('path depth distribution:', dict(sorted(depths.items())))
'''),
    md("""## 3. Parse the schema

Every path looks like
`Dataset Exercise Quality-wise/<exercise>/<quality>/<view>/subject_XXX_<exercise>_<quality>_<view>.mp4`.
The code below **derives** the fields and then verifies them against the
filename instead of assuming they agree."""), code(r'''import pandas as pd, re
rows = []
for n in files:
    if not n.lower().endswith('.mp4'):
        continue
    parts = n.split('/')
    rows.append({'path': n, 'exercise': parts[1], 'quality': parts[2], 'view': parts[3],
                 'filename': parts[-1]})
df = pd.DataFrame(rows)
df['subject'] = df['filename'].str.extract(r'subject_(\d+)')
pattern = re.compile(r'subject_(\d+)_(.+)_(good|bad)_(front|side|diagonal)\.mp4$')
bad = [f for f in df['filename'] if not pattern.match(f)]
print('videos:', len(df))
print('exercises:', sorted(df.exercise.unique()))
print('qualities:', sorted(df.quality.unique()))
print('views    :', sorted(df.view.unique()))
print('subjects :', df.subject.nunique(), sorted(df.subject.unique()))
print('filenames that do not match the expected pattern:', len(bad), bad[:5])

# folder label == filename label? folder view == filename view?
mm = df['filename'].str.extract(pattern)
mismatch = ((mm[2] != df.quality) | (mm[3] != df.view) | (mm[1] != df.exercise)).sum()
print('folder/filename label mismatches:', int(mismatch))
'''),
    md("## 4. Class and view distribution per exercise"), code(r'''pivot = df.pivot_table(index='exercise', columns=['quality'], values='filename', aggfunc='count', fill_value=0)
print(pivot)
print()
print(df.pivot_table(index=['exercise','view'], columns='quality', values='filename', aggfunc='count', fill_value=0))
print()
print('videos per exercise x view x quality:')
print(df.groupby(['exercise','view','quality']).size().unstack().describe().round(1))
'''),
    md("## 5. Participant distribution (this drives the split later)"), code(r'''sub = df.groupby(['exercise','quality']).subject.nunique().unstack()
print(sub)
print()
# how many clips does each participant contribute per exercise?
per_subject = df.groupby(['subject','exercise']).size().unstack(fill_value=0)
print(per_subject.describe().round(2))
print()
print('participants missing for some exercise:', per_subject[(per_subject == 0).any(axis=1)].index.tolist())
'''),
    md("""## 6. Integrity checks

Read the video headers (no full decode) to catch corrupted or zero-length
files, and confirm resolution/fps/duration before committing to a sampling
rate."""), code(r'''import cv2, tempfile, numpy as np
probe = []
tmp = tempfile.mkdtemp()
for n in df['path'].sample(min(60, len(df)), random_state=0):
    with z.open(n) as src:
        data = src.read()
    p = os.path.join(tmp, 'v.mp4')
    open(p, 'wb').write(data)
    cap = cv2.VideoCapture(p)
    fps = cap.get(cv2.CAP_PROP_FPS)
    nf = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    w = cap.get(cv2.CAP_PROP_FRAME_WIDTH); h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    ok, _ = cap.read()
    cap.release()
    probe.append({'fps': round(fps, 2), 'frames': int(nf), 'w': int(w), 'h': int(h),
                  'sec': round(nf / fps, 1) if fps else None, 'readable': bool(ok)})
pr = pd.DataFrame(probe)
print(pr.describe().round(2))
print()
print('fps values:', pr.fps.value_counts().to_dict())
print('unreadable:', int((~pr.readable).sum()), '| zero-frame:', int((pr.frames <= 0).sum()))
'''),
    md("""## 7. Archive selection decision

Conclusion from this inspection:

* The **Quality-wise** archive is fully labelled: `exercise / quality / view`
  folders *and* redundant labels in the filename, cross-checked above.
* Participant ids are present for all 26 participants, so a subject-level
  split is possible.
* The three target exercises (`squat`, `bicep_curl`, `push_up`) each have
  ~25 participants x 3 views x 2 qualities.

**Selected archive: `Dataset Exercise Quality-wise.zip`.** The other two
archives are the same videos re-foldered and are not needed."""),
])
write("01_dataset_inspection.ipynb", nb01)

# ---------------------------------------------------------------------------
# 02 - pose extraction
# ---------------------------------------------------------------------------
nb02 = notebook([
    md("""# 02 · Pose extraction with MediaPipe Pose Landmarker

Extracts the 33 body landmarks for every frame of every clip and stores them as
Parquet, one file per video, with metadata recoverable from the path.

Decisions taken here (and why):

| Decision | Value | Reason |
|---|---|---|
| Model | `pose_landmarker_full.task` | same model the browser will load, so train/serve match |
| Running mode | `VIDEO` | measured 60% -> 100% detection rate vs `IMAGE` on hard side views |
| Confidence thresholds | 0.30 | higher recall; failed frames are kept and counted |
| Sampling | 10 fps (native 15 fps) | halves compute with no visible loss of angle resolution |
| Failed frames | kept, `detected=0` | so the failure rate is a measurable metric, not a silent gap |"""),
    md(SETUP_MD), code(SETUP_CODE), code(DRIVE_CODE),
    md("## 1. Extract only the three target exercises"), code(r'''import zipfile, time, os
TARGET = {'squat', 'bicep_curl', 'push_up'}
RAW = ROOT / 'raw'
z = zipfile.ZipFile(ZIP)
entries = [n for n in z.namelist() if n.lower().endswith('.mp4') and n.split('/')[1] in TARGET]
print('videos to extract:', len(entries))
t0 = time.time(); done = 0
for n in entries:
    dest = RAW / '/'.join(n.split('/')[1:])
    if dest.exists() and dest.stat().st_size > 0:
        continue
    dest.parent.mkdir(parents=True, exist_ok=True)
    with z.open(n) as src, open(dest, 'wb') as fh:
        while True:
            b = src.read(1 << 20)
            if not b:
                break
            fh.write(b)
    done += 1
print(f'extracted {done} files in {time.time()-t0:.0f}s -> {RAW}')
'''),
    md("## 2. Download the pose model"), code(r'''import urllib.request, os
MDL = ROOT / 'models'; MDL.mkdir(exist_ok=True)
url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task'
dst = MDL / 'pose_landmarker_full.task'
if not dst.exists():
    urllib.request.urlretrieve(url, dst)
print('model:', dst, round(dst.stat().st_size/1e6, 2), 'MB')

import subprocess, sys
print(subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'mediapipe'], capture_output=True, text=True).returncode)
import mediapipe as mp
print('mediapipe', mp.__version__)
'''),
    md("""## 3. Run the extraction

`extract_pose.py` uses 2 worker processes and one landmarker per video (the
VIDEO tracker is stateful and requires monotonically increasing timestamps).
Expect roughly 30-50 minutes for 444 clips on a free Colab CPU.

Output columns per row: `frame_idx, t_sec, sampled, detected, lm{k}_{x,y,z,v}`."""), code(r'''!cd /content/fitness && WORKERS=2 python -u /content/fitness/extract_pose.py
'''),
    md("## 4. Pose-detection availability report"), code(r'''import json, pandas as pd
summary = json.load(open(ROOT / 'extract_summary.json'))
print('videos ok/failed:', summary['videos_ok'], '/', summary['videos_failed'])
print('frames sampled  :', summary['frames_sampled'])
print('overall detection rate:', round(summary['overall_detection_rate'], 4))
pv = pd.DataFrame(summary['per_video'])
print()
print(pv.detection_rate.describe().round(3))
print()
print('worst 10 clips:')
print(pv.nsmallest(10, 'detection_rate')[['path', 'detection_rate', 'frames_sampled']].to_string(index=False))
'''),
    md("""### What the failure rate means for the product

A clip where the pose is found in <60% of frames cannot be scored reliably, so
windows from those clips are dropped in notebook 03 (`min_detected_ratio`).
In the web app the same rule becomes: *"step back / improve lighting"* instead
of guessing."""),
])
write("02_pose_extraction.ipynb", nb02)

# ---------------------------------------------------------------------------
# 03 - feature engineering
# ---------------------------------------------------------------------------
nb03 = notebook([
    md("""# 03 · Feature engineering

Turns raw landmarks into biomechanical features, then into 2-second windows.

Never used as features: participant id, filename, exercise name, quality label.
Kept as metadata: `video_id`, `subject`, `exercise`, `view`, `quality`."""),
    md(SETUP_MD), code(SETUP_CODE),
    md("## 1. Inspect the feature definitions"), code(r'''import fitness_features as ff
print('per-frame features:', len(ff.FRAME_FEATURE_COLS))
for c in ff.FRAME_FEATURE_COLS:
    print('  ', c)
print()
print('window aggregation stats:', ff.STATS)
print('window feature count   :', len(ff.window_feature_names()))
'''),
    md("""## 2. Sanity-check the angles on one clip

A squat must show the knee angle swinging from near-straight (~170 deg) to a
deep bend, while the elbow angle stays roughly constant. If this plot is wrong,
every model downstream is wrong - so check it first."""), code(r'''import pandas as pd, matplotlib.pyplot as plt, glob
path = sorted(glob.glob(str(ROOT / 'landmarks/squat/good/side/*.parquet')))[0]
raw = pd.read_parquet(path)
feats = ff.compute_frame_features(raw[raw.detected == 1])
print(path)
feats[['t_sec', 'knee_angle_mean', 'hip_angle_mean', 'torso_inclination', 'knee_bend_abs_mean']].describe().round(1)
'''), code(r'''fig, ax = plt.subplots(3, 1, figsize=(11, 8), sharex=True)
ax[0].plot(feats.t_sec, feats.knee_angle_l, label='left')
ax[0].plot(feats.t_sec, feats.knee_angle_r, label='right')
ax[0].set_ylabel('knee angle (deg)'); ax[0].legend(); ax[0].set_title('Squat joint angles')
ax[1].plot(feats.t_sec, feats.hip_angle_mean); ax[1].set_ylabel('hip angle (deg)')
ax[2].plot(feats.t_sec, feats.torso_inclination); ax[2].set_ylabel('torso lean (deg)')
ax[2].set_xlabel('seconds'); plt.tight_layout(); plt.show()
'''),
    md("""## 3. Build the windowed dataset

`build_dataset.py` produces:

* `dataset/windows.parquet` - one row per 2 s window (stride 0.5 s), the unit
  the Random Forest trains on
* `dataset/frames.parquet` - per-frame features, the unit the LSTM trains on
* `dataset/feature_names.json` - the exact and only feature order
* `dataset/per_video.csv` - per-clip pose detection rate"""), code(r'''!cd /content/fitness && python -u /content/fitness/build_dataset.py
'''),
    md("## 4. Inspect the resulting tables"), code(r'''import json, pandas as pd
summary = json.load(open(ROOT / 'dataset/summary.json'))
print(json.dumps(summary, indent=2))
df = pd.read_parquet(ROOT / 'dataset/windows.parquet')
print(df.shape)
print(df[['video_id','exercise','quality','view','subject','label','win_start']].head())
print()
print('label balance per exercise:')
print(df.groupby(['exercise','label']).size().unstack(fill_value=0))
print()
print('windows per video:', df.groupby('video_id').size().describe().round(1).to_dict())
'''),
    md("## 5. Leakage audit (must all be True / empty)"), code(r'''feat_cols = json.load(open(ROOT / 'dataset/feature_names.json'))
forbidden = {'subject', 'video_id', 'filename', 'quality', 'label', 'path'}
print('forbidden names inside feature list:', [c for c in feat_cols if c in forbidden])
print('duplicate feature names:', len(feat_cols) != len(set(feat_cols)))
print('n features:', len(feat_cols))
print('any all-null feature:', [c for c in feat_cols if df[c].isna().all()])
'''),
])
write("03_feature_engineering.ipynb", nb03)

# ---------------------------------------------------------------------------
# 04 - baseline training
# ---------------------------------------------------------------------------
nb04 = notebook([
    md("""# 04 · From the frame-window baseline to the clip model

This notebook records a negative result honestly, then the model that replaced it.

**What the obvious approach gave.** 291 window statistics, 22,662 overlapping
2 s windows, RandomForest(depth 12), participant-level split:

| Exercise | train AUC | test AUC (unseen people) |
|---|---|---|
| squat | 0.998 | 0.722 |
| bicep_curl | 0.998 | **0.544** |
| push_up | 1.000 | 0.749 |

AUC 0.998 in-sample means the model memorised the participants. 22k nearly
identical windows from 17 people cannot teach generalisation.

Two further findings from the diagnostic experiments:

* Removing ``body_scale`` and the visibility columns (which encode *where and how
  far the camera was*, i.e. recording identity) does not fix it.
* The labelled BAD clips are almost geometrically identical to the GOOD ones:
  mean elbow ROM of a GOOD curl = 120.1 deg, of a BAD curl = 120.0 deg. The
  difference the annotators saw is cadence/control, not joint angles.

So the final model scores **one clip per sample** with pose + repetition-tempo
features, and is validated with 5-fold GroupKFold on participants."""),
    md(SETUP_MD), code(SETUP_CODE),
    md("## 1. Keep the record of the window baseline"), code(r'''!cd /content/fitness && python -u /content/fitness/train_baseline.py
'''),
    md("""## 2. Diagnostic A - do session-identity columns explain the overfit?

5-fold GroupKFold, several feature sets and models, per exercise."""), code(r'''# ~10-20 min on the free 2 vCPU runtime; safe to skip, the result is recorded in
# dataset/generalization_experiment.csv
!cd /content/fitness && python -u /content/fitness/experiment_generalization.py
'''),
    md("""## 3. Diagnostic B - clip-level domain features

One sample per clip from quantities a coach names out loud: ROM, torso lean,
knee tracking, depth, sway, symmetry. Fast (444 rows)."""), code(r'''!cd /content/fitness && python -u /content/fitness/experiment_clip.py
'''),
    md("""## 4. Diagnostic C - is the label a tempo difference?

Percentile-threshold hysteresis rep detector -> cadence, rhythm consistency,
time spent near the bottom, ROM per rep. Also prints a **univariate AUC table**,
which is the fastest way to see whether a signal exists at all."""), code(r'''!cd /content/fitness && python -u /content/fitness/experiment_repmetry.py
'''),
    md("""## 5. Train the final model (pose + tempo, one clip = one sample)

Fits on train participants, picks the decision threshold on validation
participants (max F1 subject to a 20% false-accept ceiling), reports held-out
test participants, then refits on train+val and exports ONNX with a
sklearn-vs-onnxruntime parity check."""), code(r'''!cd /content/fitness && python -u /content/fitness/train_final.py
'''),
    md("## 2. Audit the split (who is in which set)"), code(r'''import json
splits = json.load(open(ROOT / 'dataset/splits.json'))
for k, v in splits.items():
    print(f'{k:5s} ({len(v):2d} participants): {v}')
common = set(splits['train']) & set(splits['test'])
print('\noverlap train/test (must be empty):', common)
'''),
    md("## 6. Results table"), code(r'''import json, pandas as pd
fm = json.load(open(ROOT / 'export/final_metrics.json'))
rows = []
for ex, r in fm['exercises'].items():
    rows.append({'exercise': ex, 'clips': r['n_clips'],
                 'cv_auc': r['cv_5fold_group']['roc_auc'],
                 'cv_f1': r['cv_5fold_group']['f1'],
                 'test_auc': r['test']['roc_auc'], 'test_f1': r['test']['f1'],
                 'test_acc': r['test']['accuracy'],
                 'false_accept': r['test']['false_accept_rate_bad_as_good'],
                 'threshold': r['threshold']})
print(pd.DataFrame(rows).to_string(index=False))
print()
for ex, r in fm['exercises'].items():
    print(ex, 'top features:', list(r['top_features'])[:6])
'''),
    md("""## 8. How to read this

* `cv_auc` (5-fold GroupKFold over participants) is the most stable number: it
  uses every clip and never tests on a training participant.
* `test_auc` / `test_f1` use only 4 held-out participants (~24 clips), so a
  0.05-0.15 swing between reruns is noise, not progress.
* If `cv_auc` is near 0.5 the model has learned nothing generalisable - that is
  the case for bicep curls with this dataset, whatever the in-sample numbers say.
* `false_accept` (BAD form scored GOOD) is kept low by the threshold rule, which
  is why precision/recall are not balanced."""),
    md("## 7. Per-camera-view breakdown"), code(r'''# The final model is clip-level, so per-view breakdowns are computed directly on
# dataset/clip_features.parquet + dataset/rep_features.parquet. Quick check of
# whether a view is systematically easier:
import pandas as pd, numpy as np, joblib
clip = pd.read_parquet(ROOT / 'dataset/clip_features.parquet')
for ex in ['squat', 'bicep_curl', 'push_up']:
    b = joblib.load(ROOT / f'models/final_{ex}.joblib')
    d = clip[clip.exercise == ex]
    X = d[b['feature_cols']].to_numpy(np.float32)
    d = d.assign(p=b['pipeline'].predict_proba(X)[:, 1],
                 pred=(b['pipeline'].predict_proba(X)[:, 1] >= b['threshold']).astype(int))
    print(f'--- {ex} ---')
    print(d.groupby('view').apply(lambda g: pd.Series({
        'n': len(g), 'accuracy': round((g.pred == g.label).mean(), 3),
        'mean_p_good': round(g.p.mean(), 3)}), include_groups=False).to_string())
'''),
])
write("04_baseline_training.ipynb", nb04)

# ---------------------------------------------------------------------------
# 05 - temporal training
# ---------------------------------------------------------------------------
nb05 = notebook([
    md("""# 05 · Temporal model (1D-CNN + BiLSTM)

Same features, but as 6.4 s sequences instead of per-window statistics, so the
model can use the *order* of events.

Only run this after notebook 04: the baseline is the reference the temporal
model has to beat."""),
    md(SETUP_MD), code(SETUP_CODE),
    code(r'''!cd /content/fitness && python -u /content/fitness/train_temporal.py
'''),
    md("## Compare against the baseline"), code(r'''import json, pandas as pd
base = json.load(open(ROOT / 'models/metrics.json'))
temp = json.load(open(ROOT / 'models/temporal_metrics.json'))
rows = []
for ex in base['exercises']:
    rows.append({
        'exercise': ex,
        'rf_video_f1': base['exercises'][ex]['test']['video']['f1'],
        'rf_video_acc': base['exercises'][ex]['test']['video']['accuracy'],
        'rf_false_accept': base['exercises'][ex]['test']['video']['false_accept_rate_bad_as_good'],
        'seq_video_f1': temp.get(ex, {}).get('test', {}).get('video', {}).get('f1'),
        'seq_video_acc': temp.get(ex, {}).get('test', {}).get('video', {}).get('accuracy'),
        'seq_false_accept': temp.get(ex, {}).get('test', {}).get('video', {}).get('false_accept_rate_bad_as_good'),
    })
print(pd.DataFrame(rows).to_string(index=False))
'''),
    md("""The temporal model only ships if it wins on the **test** split. With 26
participants a 1-3% difference is noise, so prefer the simpler model unless the
margin is clearly larger."""),
])
write("05_temporal_training.ipynb", nb05)

# ---------------------------------------------------------------------------
# 06 - evaluation
# ---------------------------------------------------------------------------
nb06 = notebook([
    md("""# 06 · Model evaluation

Everything reported here is measured on participants the models have never
seen. Also included: rep-counting error and inference latency, which are the
two numbers that decide whether the feature is usable live."""),
    md(SETUP_MD), code(SETUP_CODE),
    md("## 1. Confusion matrices on the held-out participants"), code(r'''import json, numpy as np, matplotlib.pyplot as plt
fm = json.load(open(ROOT / 'export/final_metrics.json'))
fig, axes = plt.subplots(1, 3, figsize=(13, 4))
for ax, ex in zip(axes, fm['exercises']):
    c = fm['exercises'][ex]['test']['confusion']
    mat = np.array([[c['tn_bad_correct'], c['fp_bad_as_good']],
                    [c['fn_good_as_bad'], c['tp_good_correct']]])
    ax.imshow(mat, cmap='Blues')
    ax.set_title(f"{ex} (n={fm['exercises'][ex]['test']['n']})")
    ax.set_xticks([0, 1], ['pred BAD', 'pred GOOD']); ax.set_yticks([0, 1], ['BAD', 'GOOD'])
    for (i, j), v in np.ndenumerate(mat):
        ax.text(j, i, int(v), ha='center', va='center', color='black')
plt.tight_layout(); plt.show()
'''),
    md("## 2. Per-participant performance (held-out split)"), code(r'''import json, pandas as pd, numpy as np, joblib
fm = json.load(open(ROOT / 'export/final_metrics.json'))
splits = json.load(open(ROOT / 'dataset/splits.json'))
clip = pd.read_parquet(ROOT / 'dataset/clip_features.parquet')
rows = []
for ex in ['squat', 'bicep_curl', 'push_up']:
    b = joblib.load(ROOT / f'models/final_{ex}.joblib')
    d = clip[(clip.exercise == ex) & (clip.subject.isin(splits['test']))]
    p = b['pipeline'].predict_proba(d[b['feature_cols']].to_numpy(np.float32))[:, 1]
    d = d.assign(pred=(p >= b['threshold']).astype(int))
    for sub, g in d.groupby('subject'):
        rows.append({'exercise': ex, 'subject': sub, 'clips': len(g),
                     'accuracy': round((g.pred == g.label).mean(), 3)})
df = pd.DataFrame(rows)
print(df.pivot(index='subject', columns='exercise', values='accuracy').round(2))
print()
print('participants under 0.60 accuracy:', df[df.accuracy < 0.60].to_string(index=False))
'''),
    md("""## 3. Rep counting

Rep counting is a separate state machine, not the classifier. It is validated on
the clean (GOOD) clips: the annotated clips contain several reps each, so we
compare the state machine's count against the count implied by the deepest
angle swings.

The rule set below is deliberately simple and exercise-specific; the thresholds
come from the observed angle distributions, not from guesses."""), code(r'''import pandas as pd, numpy as np, glob
frames = pd.read_parquet(ROOT / 'dataset/frames.parquet')

def count_reps(series, t, low, high):
    """Hysteresis state machine: a rep completes when the angle goes below
    `low` (bottom) and back above `high` (top)."""
    reps, state = 0, 'top'
    for v in series:
        if not np.isfinite(v):
            continue
        if state == 'top' and v <= low:
            state = 'bottom'
        elif state == 'bottom' and v >= high:
            state = 'top'
            reps += 1
    return reps

THRESH = {'squat': ('knee_angle_mean', 110, 160),
          'bicep_curl': ('elbow_angle_mean', 80, 140),
          'push_up': ('elbow_angle_mean', 100, 155)}
rows = []
for ex, (col, low, high) in THRESH.items():
    sub = frames[(frames.exercise == ex) & (frames.quality == 'good')]
    for vid, g in sub.groupby('video_id'):
        g = g.sort_values('t_sec')
        rows.append({'exercise': ex, 'video_id': vid, 'reps': count_reps(g[col].to_numpy(), g.t_sec.to_numpy(), low, high),
                     'duration_sec': round(g.t_sec.max(), 1)})
reps = pd.DataFrame(rows)
print(reps.groupby('exercise').agg(videos=('reps', 'size'), mean_reps=('reps', 'mean'),
                                   reps_per_10s=('reps', lambda s: round(s.mean()/1.5, 1))).round(2))
print()
print('clips where the state machine found 0 reps (needs threshold tuning):')
print(reps[reps.reps == 0].groupby('exercise').size())
'''),
    md("""### Ground truth for rep counts

The Mendeley dataset labels quality, not rep counts, so a true MAE cannot be
computed from it. To finish this metric honestly you need one of:

1. hand-count the reps in 30-50 clips (fast: one afternoon, a spreadsheet), or
2. record your own clips with a known rep count.

Save as `dataset/rep_ground_truth.csv` with `video_id,true_reps`, then the
following cell reports real MAE / over- / under-counting."""), code(r'''gt_path = ROOT / 'dataset/rep_ground_truth.csv'
if gt_path.exists():
    gt = pd.read_csv(gt_path)
    merged = reps.merge(gt, on='video_id')
    merged['err'] = merged['reps'] - merged['true_reps']
    print('MAE:', round(merged['err'].abs().mean(), 2))
    print('over-counted:', int((merged['err'] > 0).sum()), '| under-counted:', int((merged['err'] < 0).sum()))
    print(merged.groupby('exercise').err.apply(lambda s: round(s.abs().mean(), 2)))
else:
    print('No rep_ground_truth.csv yet - MAE cannot be reported. Counts above are model output only.')
'''),
    md("## 4. Inference latency (must be < 500 ms)"), code(r'''import time, numpy as np, json, joblib
bundle = joblib.load(ROOT / 'models/rf_squat.joblib')
pipe, cols = bundle['pipeline'], bundle['feature_cols']
x = np.random.rand(1, len(cols)).astype(np.float32)
pipe.predict_proba(x)  # warm up
t0 = time.perf_counter()
for _ in range(200):
    pipe.predict_proba(x)
print('sklearn RF single row: %.2f ms' % ((time.perf_counter() - t0) / 200 * 1000))

import onnxruntime as ort, glob
for p in sorted(glob.glob(str(ROOT / 'export/*.onnx'))):
    s = ort.InferenceSession(p, providers=['CPUExecutionProvider'])
    inp = {s.get_inputs()[0].name: x}
    s.run(None, inp)
    t0 = time.perf_counter()
    for _ in range(200):
        s.run(None, inp)
    print(p.split('/')[-1], '%.2f ms/row (cpu onnxruntime)' % ((time.perf_counter() - t0) / 200 * 1000))
print()
print('In the browser the same ONNX graph runs on WASM/WebGL; measure it there with performance.now().')
'''),
    md("""## 5. Verdict checklist

| Target | Where it is measured | Pass? |
|---|---|---|
| Form F1 >= 0.80 | video level, test participants | see tables |
| Rep MAE <= 1 | needs `rep_ground_truth.csv` | pending hand count |
| Latency < 500 ms | notebook cell 4 + browser measurement | see printout |
| No BAD->GOOD false accept above 10% | video level test | see tables |

Do not ship on window-level numbers alone."""),
])
write("06_model_evaluation.ipynb", nb06)

# ---------------------------------------------------------------------------
# 07 - model export
# ---------------------------------------------------------------------------
nb07 = notebook([
    md("""# 07 · Model export (ONNX + metadata for the website)

Exports each Random Forest to ONNX for `onnxruntime-web`, and writes the
metadata the browser needs to reproduce training-time features exactly.

Key point: the exported pipeline **includes** the median imputer, so the browser
must NOT impute - it sends a complete float32 feature vector, or NaN, and the
graph handles it."""),
    md(SETUP_MD), code(SETUP_CODE),
    md("""## 1. Export and verify parity

The final models are produced by `train_final.py`, which fits, thresholds, exports
ONNX and checks sklearn-vs-onnxruntime agreement (including a NaN row) in one go.
Re-run it here if you changed anything upstream."""), code(r'''import subprocess, sys
print(subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'skl2onnx', 'onnxruntime'],
                     capture_output=True, text=True).returncode)
'''), code(r'''!cd /content/fitness && python -u /content/fitness/train_final.py
'''),
    md("## 2. Inspect the exported contract"), code(r'''import json
meta = json.load(open(ROOT / 'export/model_metadata.json'))
fm = json.load(open(ROOT / 'export/final_metrics.json'))
print('version:', meta['version'], '| unit:', meta['unit'])
print('feature_order length:', len(meta['feature_order']))
for ex, r in fm['exercises'].items():
    print(f"  {ex:11s} {r['onnx_file']:32s} thr={r['threshold']} "
          f"test_auc={r['test']['roc_auc']} parity={r['onnx_parity_max_abs_diff']:.2e}")
print()
print('first 12 features (must match the browser extractor exactly):')
print(meta['feature_order'][:12])
'''),
    md("""## 3. Copy artefacts to Drive

Colab runtimes are temporary. Copy the shipped models, their metadata and the
split definition to Drive so the website build always has the current version."""), code(r'''import shutil, os
DEST = '/content/drive/MyDrive/fitness_coach_models'
os.makedirs(DEST + '/export', exist_ok=True)
for f in os.listdir(ROOT / 'export'):
    shutil.copy2(ROOT / 'export' / f, DEST + '/export/' + f)
for f in ['splits.json', 'summary.json', 'clip_cv_results.csv',
          'repmetry_cv_results.csv', 'univariate_auc.csv']:
    p = ROOT / 'dataset' / f
    if p.exists():
        shutil.copy2(p, DEST + '/dataset_' + f)
print('copied to', DEST)
for r, _d, fs in os.walk(DEST):
    for f in fs:
        print('  ', os.path.join(r, f).replace(DEST + '/', ''), round(os.path.getsize(os.path.join(r, f))/1e3, 1), 'kB')
'''),
    md("""## 4. Wiring into the website

1. Copy `form_classifier_<exercise>.onnx` and `model_metadata.json` into
   `F:\\Fitness Coach\\public\\models\\`.
2. In the browser: MediaPipe Pose Landmarker (JS, same `full` model) ->
   `computeFrameFeatures()` ported 1:1 from `ml/fitness_features.py` ->
   rolling 2 s buffer -> the 8 statistics per feature in the same order as
   `meta['feature_order']` -> `ort.InferenceSession`.
3. Compare `probabilities[1]` (GOOD) against `threshold` from the metadata,
   never against 0.5.
4. Rep counting stays a separate exercise-specific state machine in TypeScript;
   do not derive it from the classifier output.
5. Feedback stays rule-based: "hip drops below knee" etc. is observable, while
   "your glutes are weak" is not diagnosable from a phone camera."""),
])
write("07_model_export.ipynb", nb07)
