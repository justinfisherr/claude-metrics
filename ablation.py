#!/usr/bin/env python3
"""Ablation study harness for jazz-ml v6.00.

Imports train.py, engineers the full feature set, then drops each feature group
in turn and retrains. No version bump, no file writes to train.py.
"""
import sys
import importlib.util
from pathlib import Path

JAZZ_ML_PATH = Path(__file__).parent
sys.path.insert(0, str(JAZZ_ML_PATH))

spec = importlib.util.spec_from_file_location("train", JAZZ_ML_PATH / "train.py")
train_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(train_mod)

BASELINE = {
    "ridge": {"r2": 0.2478, "rmse": 1.9717, "mae": 1.605},
    "rf":    {"r2": 0.2374, "rmse": 1.9854, "mae": 1.6048},
}

# era_x_energy column names (spaces are intentional — matches row keys in train.py)
ERA_X_ENERGY = [
    "era_Modal_x_energy",
    "era_Free Jazz_x_energy",
    "era_Cool Jazz_x_energy",
    "era_Bebop_x_energy",
]

FEATURE_GROUPS = [
    ("Artist×Era/Decade", [
        "artist_era_bayes_rating",
        "artist_decade_bayes_rating",
        "artist_recent_period_delta",
    ]),
    ("Ballad Splits", [
        "is_ballad", "instrumental_ballad", "vocal_ballad_penalty",
        "ballad_acousticness", "ballad_low_energy", "ballad_high_instrumentalness",
    ]),
    ("Enhanced Collaborators", [
        "best_collaborator_rating", "top2_collaborator_mean",
        "favorite_collaborator_count", "collaborator_rating_variance",
        "has_elite_collaborator",
    ]),
    ("Label×Decade", [
        "label_decade_bayes_rating",
        "prestige_1950s_1960s", "blue_note_1950s_1960s", "impulse_1960s",
    ]),
    ("Confidence Metrics", [
        "artist_rating_count_log", "artist_rating_variance", "artist_bayes_confidence",
        "collaborator_count_log", "collaborator_bayes_confidence",
    ]),
    ("Recency", [
        "rating_order_percentile", "is_recent",
    ]),
    ("Musical Interactions", [
        "hard_bop_medium_energy", "hard_bop_instrumental", "modal_low_energy",
        "free_jazz_high_complexity_penalty", "swing_big_band_penalty",
        "energy_x_instrumentalness", "complexity_x_instrumentalness",
        "valence_x_instrumentalness", "energy_x_ballad", "complexity_x_ballad",
    ] + ERA_X_ENERGY),
    ("Missingness Indicators", [
        "missing_energy", "missing_valence", "missing_acousticness",
        "missing_instrumentalness", "missing_audio_any", "missing_audio_count",
    ]),
]


def run_ablation(X_full, y, drop_cols):
    existing = [c for c in drop_cols if c in X_full.columns]
    missing  = [c for c in drop_cols if c not in X_full.columns]
    if missing:
        print(f"    (not found, skipping: {missing})")
    X_ab = X_full.drop(columns=existing)
    return train_mod.train_models(X_ab, y), len(existing)


def fmt_delta(val, base):
    d = val - base
    sign = "+" if d >= 0 else ""
    return f"{sign}{d:.4f}"


def main():
    print("Loading data...")
    tracks, _ = train_mod.load_data()
    print(f"  {len(tracks)} tracks")

    print("Engineering full feature set...")
    X, y, feature_names, _, _ = train_mod.engineer_features(tracks)
    print(f"  {X.shape[0]} samples × {X.shape[1]} features\n")

    lines = [
        "Ablation Study Results — v6.00 Baseline",
        "=" * 72,
        "",
        "Baseline (v6.00):",
        f"  Ridge: R²={BASELINE['ridge']['r2']:.4f}, RMSE={BASELINE['ridge']['rmse']:.4f}, MAE={BASELINE['ridge']['mae']:.4f}",
        f"  RF:    R²={BASELINE['rf']['r2']:.4f}, RMSE={BASELINE['rf']['rmse']:.4f}, MAE={BASELINE['rf']['mae']:.4f}",
        "",
    ]

    summary_rows = []

    for i, (group_name, drop_cols) in enumerate(FEATURE_GROUPS):
        version = f"6.{i + 1:02d}"
        print(f"[v{version}] Without {group_name} ({len(drop_cols)} features)...")
        res, n_dropped = run_ablation(X, y, drop_cols)

        r  = res["ridge"]
        rf = res["random_forest"]

        dr2_ridge = r["r_squared"]  - BASELINE["ridge"]["r2"]
        dr2_rf    = rf["r_squared"] - BASELINE["rf"]["r2"]

        print(f"  Ridge: R²={r['r_squared']:.4f} (Δ{dr2_ridge:+.4f})")
        print(f"  RF:    R²={rf['r_squared']:.4f} (Δ{dr2_rf:+.4f})\n")

        lines += [
            f"Without {group_name} (v{version}):",
            f"  Ridge: R²={r['r_squared']:.4f}, RMSE={r['rmse']:.4f}, MAE={r['mae']:.4f}"
            f"  | ΔR²={fmt_delta(r['r_squared'], BASELINE['ridge']['r2'])}"
            f"  ΔRMSE={fmt_delta(r['rmse'], BASELINE['ridge']['rmse'])}",
            f"  RF:    R²={rf['r_squared']:.4f}, RMSE={rf['rmse']:.4f}, MAE={rf['mae']:.4f}"
            f"  | ΔR²={fmt_delta(rf['r_squared'], BASELINE['rf']['r2'])}"
            f"  ΔRMSE={fmt_delta(rf['rmse'], BASELINE['rf']['rmse'])}",
            "",
        ]
        summary_rows.append((group_name, dr2_ridge, n_dropped))

    # Summary sorted by impact
    summary_rows.sort(key=lambda x: x[1])  # most negative = most important
    lines += [
        "=" * 72,
        "SUMMARY — Feature groups ranked by Ridge R² impact (drop = removal hurts more):",
        "",
    ]
    for rank, (name, delta, n) in enumerate(summary_rows, 1):
        lines.append(f"  {rank}. {name} ({n} features): ΔR²={delta:+.4f}")

    out_path = JAZZ_ML_PATH / "ablation_results.txt"
    out_path.write_text("\n".join(lines) + "\n")
    print(f"Results saved to {out_path}")

    print("\n" + "=" * 50)
    print("RANKING (most → least important):")
    for rank, (name, delta, n) in enumerate(summary_rows, 1):
        print(f"  {rank}. {name}: ΔR²={delta:+.4f}")


if __name__ == "__main__":
    main()
