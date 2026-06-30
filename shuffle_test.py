#!/usr/bin/env python3
"""Permutation / shuffle test for collaborator features.

For each trial: shuffle each collaborator column independently,
retrain, record R². If the signal is real, R² should collapse
relative to the unshuffled baseline.
"""
import sys, importlib.util
import numpy as np
from pathlib import Path

JAZZ_ML_PATH = Path(__file__).parent
sys.path.insert(0, str(JAZZ_ML_PATH))

spec = importlib.util.spec_from_file_location("train", JAZZ_ML_PATH / "train.py")
train_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(train_mod)

COLLAB_COLS = [
    "collaborator_quality",         # base LOO collab feature
    "best_collaborator_rating",     # Group 3
    "top2_collaborator_mean",       # Group 3
    "favorite_collaborator_count",  # Group 3
    "collaborator_rating_variance", # Group 3
    "has_elite_collaborator",       # Group 3
    "collaborator_count_log",       # Group 5
    "collaborator_bayes_confidence",# Group 5
]

N_TRIALS = 10

BASELINE_RIDGE_R2 = 0.2478
BASELINE_RF_R2    = 0.2374

def shuffle_collab_cols(X, rng):
    X_shuf = X.copy()
    for col in COLLAB_COLS:
        if col in X_shuf.columns:
            X_shuf[col] = rng.permutation(X_shuf[col].values)
    return X_shuf


def main():
    print("Loading data and engineering features...")
    tracks, _ = train_mod.load_data()
    X, y, _, _, _ = train_mod.engineer_features(tracks)
    present = [c for c in COLLAB_COLS if c in X.columns]
    print(f"Shuffling {len(present)} collaborator columns: {present}\n")

    ridge_r2s, rf_r2s = [], []
    for trial in range(N_TRIALS):
        rng = np.random.default_rng(seed=trial)
        X_shuf = shuffle_collab_cols(X, rng)
        res = train_mod.train_models(X_shuf, y)
        r2_ridge = res["ridge"]["r_squared"]
        r2_rf    = res["random_forest"]["r_squared"]
        ridge_r2s.append(r2_ridge)
        rf_r2s.append(r2_rf)
        print(f"  Trial {trial+1:2d}: Ridge R²={r2_ridge:.4f}  RF R²={r2_rf:.4f}")

    mean_ridge = np.mean(ridge_r2s)
    mean_rf    = np.mean(rf_r2s)
    std_ridge  = np.std(ridge_r2s)

    drop_ridge = BASELINE_RIDGE_R2 - mean_ridge
    drop_rf    = BASELINE_RF_R2    - mean_rf

    print(f"""
Shuffle test summary ({N_TRIALS} trials)
============================================================
                      Ridge R²        RF R²
  Baseline (real):    {BASELINE_RIDGE_R2:.4f}          {BASELINE_RF_R2:.4f}
  Shuffled (mean):    {mean_ridge:.4f} ±{std_ridge:.4f}  {mean_rf:.4f}
  Drop:               {drop_ridge:+.4f}          {drop_rf:+.4f}

Verdict:""")

    if drop_ridge > 0.05:
        print(f"  REAL SIGNAL — R² collapsed by {drop_ridge:.4f} when collaborator "
              f"features were shuffled. The leakage hypothesis is refuted.")
    elif drop_ridge > 0.01:
        print(f"  WEAK SIGNAL — modest drop ({drop_ridge:.4f}). Some real signal but "
              f"also possible partial leakage worth investigating.")
    else:
        print(f"  SUSPICIOUS — R² barely changed ({drop_ridge:.4f}). The signal may "
              f"not be coming from the collaborator features themselves.")


if __name__ == "__main__":
    main()
