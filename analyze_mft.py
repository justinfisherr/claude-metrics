"""
Deep analysis of "My Favorite Things" prediction vs So What / Blue Train / Equinox.
Steps 1-4 from the investigation plan.
"""
import json
import sys
import numpy as np
import joblib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from train import engineer_features, load_data, readable_name

SCRIPT_DIR = Path(__file__).parent

def load_model_and_data():
    artifact = joblib.load(SCRIPT_DIR / "model.joblib")
    tracks, _ = load_data()
    X_raw, y, feature_names_raw, _, _ = engineer_features(tracks)

    # Align X to the model's saved feature names (handles new era/subgenre columns added since last train)
    model_features = artifact["feature_names"]
    import pandas as pd
    X = pd.DataFrame(index=X_raw.index)
    for fn in model_features:
        if fn in X_raw.columns:
            X[fn] = X_raw[fn]
        else:
            X[fn] = 0.0

    feature_names = model_features
    return artifact, tracks, X, y, feature_names

def get_song_idx(tracks, title):
    for i, t in enumerate(tracks):
        if t["title"] == title:
            return i
    return None

def ridge_contributions(artifact, X, feature_names, idx):
    """Coefficient × standardized_value = contribution for each feature."""
    scaler = artifact["scaler"]
    ridge  = artifact["model"]
    X_scaled = scaler.transform(X)
    coefs = ridge.coef_
    intercept = ridge.intercept_

    x = X_scaled[idx]
    contributions = coefs * x
    return {
        "intercept": float(intercept),
        "features": [
            {
                "name": readable_name(feature_names[i]),
                "raw_value": float(X.iloc[idx, i]),
                "scaled_value": float(x[i]),
                "coefficient": float(coefs[i]),
                "contribution": float(contributions[i]),
            }
            for i in range(len(feature_names))
        ],
        "predicted": float(intercept + contributions.sum()),
    }

def nearest_neighbors(artifact, X, tracks, target_idx, n=20):
    scaler = artifact["scaler"]
    X_scaled = scaler.transform(X)
    target = X_scaled[target_idx]
    dists = np.linalg.norm(X_scaled - target, axis=1)
    order = np.argsort(dists)
    neighbors = []
    for i in order:
        if i == target_idx:
            continue
        neighbors.append({
            "title": tracks[i]["title"],
            "artist": tracks[i]["artist"],
            "actual": tracks[i]["rating"],
            "distance": round(float(dists[i]), 4),
        })
        if len(neighbors) == n:
            break
    return neighbors

def feature_diff(artifact, X, feature_names, idx_a, idx_b):
    """Feature-level diff between two songs (raw values)."""
    diffs = []
    for i, fn in enumerate(feature_names):
        va = float(X.iloc[idx_a, i])
        vb = float(X.iloc[idx_b, i])
        if abs(va - vb) > 0.01:
            diffs.append({
                "feature": readable_name(fn),
                "mft": va,
                "other": vb,
                "delta": round(va - vb, 4),
            })
    diffs.sort(key=lambda d: abs(d["delta"]), reverse=True)
    return diffs

def biggest_misses(tracks, artifact, X, y, feature_names, top_n=15):
    scaler = artifact["scaler"]
    ridge  = artifact["model"]
    X_scaled = scaler.transform(X)
    preds = ridge.predict(X_scaled)
    misses = []
    for i, t in enumerate(tracks):
        actual = t["rating"]
        pred = round(float(preds[i]), 2)
        error = actual - pred
        if error > 0:  # underpredicted
            misses.append({
                "title": t["title"],
                "artist": t["artist"],
                "actual": actual,
                "predicted": pred,
                "error": round(error, 2),
            })
    misses.sort(key=lambda m: m["error"], reverse=True)
    return misses[:top_n]


def main():
    print("Loading model and data...")
    artifact, tracks, X, y, feature_names = load_model_and_data()

    targets = {
        "My Favorite Things": None,
        "So What":            None,
        "Blue Train":         None,
        "Equinox":            None,
    }
    for title in targets:
        targets[title] = get_song_idx(tracks, title)

    mft_idx = targets["My Favorite Things"]

    # ─── Step 1: Ridge decomposition for MFT ──────────────────────────────────
    print("\n" + "=" * 70)
    print("STEP 1 — RIDGE DECOMPOSITION: My Favorite Things")
    print("=" * 70)

    mft_contrib = ridge_contributions(artifact, X, feature_names, mft_idx)
    feats = sorted(mft_contrib["features"], key=lambda f: abs(f["contribution"]), reverse=True)

    print(f"\nIntercept (global mean proxy): {mft_contrib['intercept']:.3f}")
    print(f"Model prediction (in-sample):  {mft_contrib['predicted']:.3f}")
    print(f"Actual rating:                 {tracks[mft_idx]['rating']}")

    print("\nTop 25 features by |contribution|:")
    print(f"{'Feature':<45} {'Raw':>8} {'Scaled':>8} {'Coef':>8} {'Contrib':>8}")
    print("-" * 80)
    for f in feats[:25]:
        print(f"{f['name']:<45} {f['raw_value']:>8.3f} {f['scaled_value']:>8.3f} "
              f"{f['coefficient']:>8.4f} {f['contribution']:>8.4f}")

    print("\nPositive contributors (pushing prediction UP):")
    pos = sorted([f for f in feats if f["contribution"] > 0.05], key=lambda f: -f["contribution"])
    for f in pos[:12]:
        print(f"  +{f['contribution']:.3f}  {f['name']}  (raw={f['raw_value']:.3f})")

    print("\nNegative contributors (dragging prediction DOWN):")
    neg = sorted([f for f in feats if f["contribution"] < -0.05], key=lambda f: f["contribution"])
    for f in neg[:12]:
        print(f"  {f['contribution']:.3f}  {f['name']}  (raw={f['raw_value']:.3f})")

    # ─── Step 2: Feature comparison across four songs ─────────────────────────
    print("\n" + "=" * 70)
    print("STEP 2 — FEATURE COMPARISON: MFT vs the three high-rated songs")
    print("=" * 70)

    comparisons = [("So What", 10), ("Blue Train", 8), ("Equinox", 8.5)]
    for other_title, other_rating in comparisons:
        other_idx = targets[other_title]
        diffs = feature_diff(artifact, X, feature_names, mft_idx, other_idx)
        print(f"\n  MFT vs {other_title} (actual {other_rating})  — top 15 raw-value differences:")
        print(f"  {'Feature':<42} {'MFT':>8} {other_title[:12]:>12} {'Δ':>8}")
        print("  " + "-" * 75)
        for d in diffs[:15]:
            print(f"  {d['feature']:<42} {d['mft']:>8.3f} {d['other']:>12.3f} {d['delta']:>+8.3f}")

    # ─── Step 3: What concepts are missing? ───────────────────────────────────
    print("\n" + "=" * 70)
    print("STEP 3 — MISSING CONCEPT AUDIT: My Favorite Things raw features")
    print("=" * 70)

    audio_keys = [
        "duration_s", "popularity", "tempo_bpm", "time_signature",
        "acousticness", "danceability", "spotify_energy", "instrumentalness",
        "liveness", "loudness", "speechiness", "spotify_valence",
    ]
    modal_keys = [
        "is_dorian", "is_minor_key", "modal_low_energy",
        "era_Modal_x_energy",
    ]
    texture_keys = [
        "energy", "harmonic_complexity", "tempo", "ensemble_size",
        "energy_x_complexity", "energy_x_instrumentalness",
        "complexity_x_instrumentalness",
    ]
    print("\n  Audio features (Spotify/ReccoBeats):")
    for k in audio_keys:
        if k in X.columns:
            print(f"    {k:<35} = {float(X.iloc[mft_idx][k]):.4f}")
        else:
            print(f"    {k:<35}   [NOT IN MODEL]")

    print("\n  Modal/mode features:")
    for k in modal_keys:
        if k in X.columns:
            print(f"    {k:<35} = {float(X.iloc[mft_idx][k]):.4f}")
        else:
            print(f"    {k:<35}   [NOT IN MODEL]")

    print("\n  Texture/energy features:")
    for k in texture_keys:
        if k in X.columns:
            print(f"    {k:<35} = {float(X.iloc[mft_idx][k]):.4f}")
        else:
            print(f"    {k:<35}   [NOT IN MODEL]")

    print("\n  Things NOT represented in any feature:")
    absent = [
        "hypnotic repetition / vamp structure",
        "long-form modal improvisation (specific feature)",
        "spiritual / devotional atmosphere",
        "soprano sax (grouped with tenor sax — no separate encoding)",
        "waltz/3/4 time signature (time_signature=3 exists but check contribution)",
        "gradual band build / developmental arc",
        "McCoy Tyner's modal piano voicings",
    ]
    for a in absent:
        print(f"    - {a}")

    # Check if 3/4 time is captured
    ts = float(X.iloc[mft_idx]["time_signature"]) if "time_signature" in X.columns else None
    ts_contrib = next((f for f in feats if "Time Signature" in f["name"]), None)
    if ts_contrib:
        print(f"\n  time_signature raw={ts}, contribution={ts_contrib['contribution']:.4f} "
              f"(coef={ts_contrib['coefficient']:.4f})")

    # ─── Step 4: Nearest neighbors ────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("STEP 4 — NEAREST NEIGHBORS in feature space (My Favorite Things)")
    print("=" * 70)

    neighbors = nearest_neighbors(artifact, X, tracks, mft_idx, n=20)
    print(f"\n{'Rank':<5} {'Title':<40} {'Artist':<25} {'Actual':>7} {'Dist':>8}")
    print("-" * 90)
    for rank, nb in enumerate(neighbors, 1):
        print(f"{rank:<5} {nb['title']:<40} {nb['artist']:<25} {nb['actual']:>7} {nb['distance']:>8.3f}")

    # Highlight songs that are rated high but far from MFT
    print("\n  High-rated songs (>=8) nearest to MFT:")
    high = [nb for nb in neighbors if nb["actual"] >= 8.0]
    for nb in high:
        print(f"    dist={nb['distance']:.3f}  {nb['title']} ({nb['artist']})  actual={nb['actual']}")

    # ─── Greatest Misses ──────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("GREATEST MISSES — Top underpredicted tracks (in-sample)")
    print("=" * 70)
    misses = biggest_misses(tracks, artifact, X, y, feature_names)
    print(f"\n{'Song':<40} {'Artist':<25} {'Actual':>7} {'Pred':>7} {'Error':>7}")
    print("-" * 90)
    for m in misses:
        print(f"{m['title']:<40} {m['artist']:<25} {m['actual']:>7} {m['predicted']:>7} {m['error']:>+7.2f}")


if __name__ == "__main__":
    main()
