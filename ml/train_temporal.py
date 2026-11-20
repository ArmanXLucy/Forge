"""
train_temporal.py
=================
Temporal (sequence) model per exercise: small 1D-CNN + BiLSTM over the
per-frame biomechanical features.

    /content/fitness/dataset/frames.parquet
      -> /content/fitness/models/lstm_<exercise>.pt
      -> /content/fitness/models/temporal_metrics.json

Why bother after the Random Forest baseline: a single 2 s window's statistics
can look identical for a clean rep and a sloppy one. The *order* of events
(locking the elbow before the hip rises, hips sagging before the push) only
shows up in the sequence.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import f1_score, roc_auc_score
from torch.utils.data import DataLoader, TensorDataset

sys.path.insert(0, "/content/fitness")
import fitness_features as ff  # noqa: E402

ROOT = "/content/fitness"
DS = os.path.join(ROOT, "dataset")
MODELS = os.path.join(ROOT, "models")
os.makedirs(MODELS, exist_ok=True)

EXERCISES = ["squat", "bicep_curl", "push_up"]
SEQ_LEN = 64          # 6.4 s at 10 fps
SEQ_STRIDE = 16
SEED = 42

torch.manual_seed(SEED)
np.random.seed(SEED)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class SeqModel(nn.Module):
    def __init__(self, n_features: int, hidden: int = 64):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(n_features, 64, kernel_size=5, padding=2),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Conv1d(64, 64, kernel_size=5, padding=2),
            nn.BatchNorm1d(64),
            nn.ReLU(),
        )
        self.lstm = nn.LSTM(64, hidden, batch_first=True, bidirectional=True, num_layers=1)
        self.head = nn.Sequential(
            nn.Linear(hidden * 2 * 2, 64), nn.ReLU(), nn.Dropout(0.3), nn.Linear(64, 1)
        )

    def forward(self, x):                 # x: (B, T, F)
        h = self.conv(x.transpose(1, 2))  # (B, 64, T)
        h, _ = self.lstm(h.transpose(1, 2))  # (B, T, 2H)
        pooled = torch.cat([h.mean(dim=1), h.amax(dim=1)], dim=1)
        return self.head(pooled).squeeze(-1)


def build_sequences(frames: pd.DataFrame, feature_cols: list[str]):
    X, y, meta = [], [], []
    for vid, g in frames.groupby("video_id", sort=False):
        g = g.sort_values("t_sec")
        arr = g[feature_cols].to_numpy(np.float32)
        lab = int(g["label"].iloc[0])
        # median-impute inside the video so short landmark dropouts do not zero out
        med = np.nanmedian(arr, axis=0)
        med = np.where(np.isfinite(med), med, 0.0)
        idx = np.where(~np.isfinite(arr))
        arr[idx] = np.take(med, idx[1])
        if len(arr) < SEQ_LEN:
            pad = np.repeat(arr[-1:], SEQ_LEN - len(arr), axis=0)
            arr = np.vstack([arr, pad])
        for start in range(0, max(1, len(arr) - SEQ_LEN + 1), SEQ_STRIDE):
            chunk = arr[start:start + SEQ_LEN]
            if len(chunk) < SEQ_LEN:
                break
            X.append(chunk)
            y.append(lab)
            meta.append({
                "video_id": vid,
                "subject": g["subject"].iloc[0],
                "exercise": g["exercise"].iloc[0],
                "view": g["view"].iloc[0],
                "label": lab,
                "start": float(g["t_sec"].iloc[start]),
            })
    return np.asarray(X, np.float32), np.asarray(y, np.float32), pd.DataFrame(meta)


def evaluate(model, X, y, thr=0.5):
    model.eval()
    with torch.no_grad():
        logits = model(torch.from_numpy(X).to(DEVICE)).cpu().numpy()
    p = 1 / (1 + np.exp(-logits))
    pred = (p >= thr).astype(int)
    return p, {
        "n": int(len(y)),
        "accuracy": float((pred == y).mean()),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, p)) if len(set(y.tolist())) > 1 else float("nan"),
    }


def train_exercise(ex: str, frames: pd.DataFrame, splits: dict, feature_cols: list[str]):
    ex_frames = frames[frames["exercise"] == ex].reset_index(drop=True)
    X, y, meta = build_sequences(ex_frames, feature_cols)
    tr = meta["subject"].isin(splits["train"]).to_numpy()
    va = meta["subject"].isin(splits["val"]).to_numpy()
    te = meta["subject"].isin(splits["test"]).to_numpy()
    print(f"[{ex}] sequences train/val/test = {tr.sum()}/{va.sum()}/{te.sum()}", flush=True)

    model = SeqModel(X.shape[2]).to(DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    lossf = nn.BCEWithLogitsLoss()
    dl = DataLoader(
        TensorDataset(torch.from_numpy(X[tr]), torch.from_numpy(y[tr])),
        batch_size=64, shuffle=True, drop_last=True,
    )

    best_auc, best_state, patience = -1.0, None, 0
    for epoch in range(1, 31):
        model.train()
        tot = 0.0
        for xb, yb in dl:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)
            opt.zero_grad()
            loss = lossf(model(xb), yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
            opt.step()
            tot += float(loss) * len(xb)
        _, vm = evaluate(model, X[va], y[va])
        print(f"  epoch {epoch:02d} loss {tot/len(dl.dataset):.4f} val_auc {vm['roc_auc']:.4f} "
              f"val_f1 {vm['f1']:.4f}", flush=True)
        if vm["roc_auc"] > best_auc:
            best_auc, best_state, patience = vm["roc_auc"], {k: v.clone() for k, v in model.state_dict().items()}, 0
        else:
            patience += 1
            if patience >= 5:
                print("  early stop", flush=True)
                break

    if best_state:
        model.load_state_dict(best_state)

    out = {}
    for name, m in (("val", va), ("test", te)):
        if m.sum() == 0:
            continue
        p, sm = evaluate(model, X[m], y[m])
        sub = meta[m].copy()
        sub["proba"] = p
        vid = sub.groupby("video_id").agg(label=("label", "first"), proba=("proba", "mean")).reset_index()
        vm = evaluate_labels(vid["label"].to_numpy(), vid["proba"].to_numpy())
        out[name] = {"sequence": sm, "video": vm}
        print(f"  [{name}] seq F1 {sm['f1']:.3f}  video acc {vm['accuracy']:.3f} "
              f"video F1 {vm['f1']:.3f}  false-accept(BAD->GOOD) {vm['false_accept_rate_bad_as_good']:.3f}",
              flush=True)

    torch.save(
        {"state_dict": model.state_dict(), "n_features": len(feature_cols),
         "feature_cols": feature_cols, "seq_len": SEQ_LEN, "exercise": ex},
        os.path.join(MODELS, f"lstm_{ex}.pt"),
    )
    return out


def evaluate_labels(y, p, thr=0.5):
    pred = (p >= thr).astype(int)
    tn = int(((y == 0) & (pred == 0)).sum())
    fp = int(((y == 0) & (pred == 1)).sum())
    fn = int(((y == 1) & (pred == 0)).sum())
    tp = int(((y == 1) & (pred == 1)).sum())
    return {
        "n": int(len(y)),
        "accuracy": round(float((pred == y).mean()), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "confusion": {"tn_bad_correct": tn, "fp_bad_as_good": fp,
                      "fn_good_as_bad": fn, "tp_good_correct": tp},
        "false_accept_rate_bad_as_good": round(fp / (fp + tn), 4) if (fp + tn) else 0.0,
        "false_reject_rate_good_as_bad": round(fn / (fn + tp), 4) if (fn + tp) else 0.0,
    }


def main():
    frames = pd.read_parquet(os.path.join(DS, "frames.parquet"))
    splits = json.load(open(os.path.join(DS, "splits.json")))
    feature_cols = ff.FRAME_FEATURE_COLS
    print("device:", DEVICE, flush=True)
    results = {}
    for ex in EXERCISES:
        results[ex] = train_exercise(ex, frames, splits, feature_cols)
    with open(os.path.join(MODELS, "temporal_metrics.json"), "w") as fh:
        json.dump(results, fh, indent=2)
    print("saved temporal_metrics.json", flush=True)


if __name__ == "__main__":
    main()
