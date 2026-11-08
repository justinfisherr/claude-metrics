#!/usr/bin/env python3
"""Honest evaluation for the taste model.

    python3 eval.py            # unseen-album holdout + rank metrics
    python3 eval.py --parity   # + does a candidate score depend on list position?
    python3 eval.py --leak     # + how much does the model rely on rating encodings?

The number that matters is the album-grouped holdout: whole albums are hidden,
every target encoding is rebuilt with those ratings masked out, and the model is
scored on records it has never seen. The old dashboard headline (LOO R² ~0.76)
was measuring album recall, not taste.

`--parity` catches the other half of the problem: a candidate scored in place vs.
scored after being appended should get the same number. The old pipeline moved
"My Favorite Things" from 9.09 to 4.94 purely because of its list position.
"""

import argparse
import json
import warnings
from pathlib import Path

import numpy as np

warnings.filterwarnings("ignore")

import train  # noqa: E402

DASHBOARD = Path(__file__).parent / "dashboard-data.json"
TARGET_ENCODINGS = train.TARGET_ENCODING_KEYS


def load_tracks():
    tracks, _ = train.load_data()
    return [t for t in tracks if t.get("rating") is not None]


def all_features(tracks):
    """Every engineered column, including the rating-derived ones."""
    X, _, names, _, _ = train.engineer_features(tracks)
    audio = (
        "acousticness", "danceability", "spotify_energy", "spotify_valence",
        "instrumentalness", "loudness", "speechiness", "liveness", "tempo_bpm",
        "duration", "popularity", "is_live", "is_minor", "is_dorian",
        "missing_energy", "missing_valence", "missing_acous", "missing_instrument",
        "missing_audio", "valence_x_energy",
    )
    dropped = [c for c in X.columns if any(k in c for k in audio)]
    return [c for c in names if c not in dropped]


def model_features(tracks):
    """The columns the deployed model actually sees (no rating-derived means)."""
    return [c for c in all_features(tracks) if c not in TARGET_ENCODINGS]


def show(label, metrics):
    print(
        f"{label:28s} R² {metrics['r_squared']:+.3f}  "
        f"Spearman {metrics['spearman']:+.3f}  "
        f"top-decile lift {metrics['top_decile_lift']:+.2f}  "
        f"RMSE {metrics['rmse']:.2f}"
    )


def parity_check(tracks, limit=15):
    """Score a row in place, then score the same row with its rating masked out
    (i.e. as a brand-new candidate). The features are rebuilt from scratch each
    time, so any difference is pure position/metadata handling."""
    import predict

    model_data = predict.load_model()
    model, scaler = model_data["model"], model_data["scaler"]
    features = model_data["feature_names"]

    rng = np.random.default_rng(7)
    sample = rng.choice(len(tracks), min(limit, len(tracks)), replace=False)
    in_place = np.array(predict.predict_tracks([tracks[i] for i in sample]))

    as_new = []
    for i in sample:
        masked = [dict(t) for t in tracks]
        masked[i]["rating"] = None
        X, _, _, _, _ = train.engineer_features(masked)
        X = X.reindex(columns=features, fill_value=0)
        as_new.append(float(np.clip(model.predict(scaler.transform(X.iloc[[i]]))[0], 1, 10)))
    delta = np.abs(in_place - np.array(as_new))
    print(
        f"score parity ({len(sample)} tracks): mean |Δ| {delta.mean():.3f}, max |Δ| {delta.max():.3f}"
    )
    if delta.max() > 0.25:
        print("  WARNING: a candidate's score still depends on how it enters the dataset.")
    return float(delta.mean()), float(delta.max())


def main():
    parser = argparse.ArgumentParser(description="Honest evaluation of the jazz taste model")
    parser.add_argument("--parity", action="store_true", help="check in-place vs appended scoring")
    parser.add_argument("--leak", action="store_true", help="re-measure with the rating encodings added back")
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--by-source", action="store_true", help="break the holdout down by discovered_from")
    args = parser.parse_args()

    tracks = load_tracks()
    features = model_features(tracks)
    print(f"{len(tracks)} rated tracks, {len(set(train.album_groups(tracks)))} albums, "
          f"{len(features)} model features\n")

    holdouts = train.album_holdout(tracks, features, n_splits=args.folds)
    for name, metrics in holdouts.items():
        show(name, metrics)
    holdout = max(holdouts.values(), key=lambda m: m["spearman"])

    if DASHBOARD.exists():
        meta = json.loads(DASHBOARD.read_text()).get("meta", {})
        stored = (meta.get("evaluation") or {}).get("in_sample_loo") or {}
        if stored:
            print(f"stored in-sample LOO R² {stored.get('r_squared')} "
                  f"(not comparable — same-album rows were in the fit)")

    if args.by_source:
        print()
        _, preds, y_true, groups = train.album_holdout(
            tracks, features, n_splits=args.folds, return_preds=True
        )
        best_name = max(holdouts, key=lambda k: holdouts[k]["spearman"])
        best_preds = preds[best_name]
        from scipy.stats import spearmanr

        rated = [i for i, t in enumerate(tracks) if t.get("rating") is not None]
        buckets = {}
        for pos, i in enumerate(rated):
            source = tracks[i].get("discovered_from") or "unknown"
            buckets.setdefault(source, []).append(pos)
        print(f"by discovery source ({best_name})")
        for source, positions in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
            if len(positions) < 12:
                continue
            r = spearmanr(y_true[positions], best_preds[positions]).statistic
            print(f"  {source:<22} n={len(positions):<3d} Spearman {r:+.3f}")

    if args.parity:
        print()
        parity_check(tracks)

    if args.leak:
        print()
        leaky = train.album_holdout(tracks, all_features(tracks), n_splits=args.folds)
        best_leaky = max(leaky.values(), key=lambda m: m["spearman"])
        show("with rating encodings", best_leaky)
        drop = holdout["spearman"] - best_leaky["spearman"]
        print(
            f"rating-encoding contribution: {drop:+.3f} Spearman. "
            "Positive means the collaborator/era/label means were helping; negative means "
            "they were overfitting the albums in the training set."
        )


if __name__ == "__main__":
    main()
