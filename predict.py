#!/usr/bin/env python3
"""
Score a candidate jazz track against the trained taste model.

Usage:
  Interactive:  python3 predict.py
  JSON input:   python3 predict.py --json '{"title":"Naima","energy":2,"tempo":"slow",...}'
  From file:    python3 predict.py --file candidates.json
"""

import json
import sys
import argparse
from pathlib import Path

import numpy as np
import joblib

SCRIPT_DIR = Path(__file__).parent
MODEL_PATH = SCRIPT_DIR / "model.joblib"

TEMPO_MAP = {"slow": 1, "medium": 2, "medium-fast": 3, "fast": 4, "varied": 2.5}
COMPLEXITY_MAP = {"low": 1, "medium": 2, "high": 3}
INSTRUMENT_GROUPS = {
    "tenor saxophone": "tenor_sax", "saxophone": "tenor_sax",
    "piano": "piano", "vocals": "vocals", "bass": "bass", "trumpet": "trumpet",
}


def load_model():
    if not MODEL_PATH.exists():
        print("No trained model found. Run `python3 train.py` first.")
        sys.exit(1)
    return joblib.load(MODEL_PATH)


def track_to_features(track, model_data):
    feature_names = model_data["feature_names"]
    common_moods = model_data["common_moods"]
    common_subgenres = model_data["common_subgenres"]
    eras = model_data["eras"]

    row = {}
    row["energy"] = track.get("energy", 5)
    row["year"] = track.get("year") or 1960
    row["tempo"] = TEMPO_MAP.get(track.get("tempo", "medium"), 2.5)
    row["harmonic_complexity"] = COMPLEXITY_MAP.get(track.get("harmonic_complexity", "medium"), 2)

    track_era = track.get("era", "Unknown")
    for era in eras:
        row[f"era_{era}"] = 1 if track_era == era else 0

    instrument = track.get("primary_instrument", "other")
    group = INSTRUMENT_GROUPS.get(instrument, "other")
    for g in ["tenor_sax", "piano", "vocals", "bass", "trumpet", "other"]:
        row[f"inst_{g}"] = 1 if group == g else 0

    track_moods = track.get("moods", [])
    for m in common_moods:
        row[f"mood_{m}"] = 1 if m in track_moods else 0

    track_subgenres = track.get("subgenres", [])
    for s in common_subgenres:
        row[f"subgenre_{s}"] = 1 if s in track_subgenres else 0

    row["mood_count"] = len(track_moods)
    row["subgenre_count"] = len(track_subgenres)

    vector = [row.get(f, 0) for f in feature_names]
    return np.array(vector).reshape(1, -1)


def predict_track(track, model_data):
    model = model_data["model"]
    scaler = model_data["scaler"]

    X = track_to_features(track, model_data)
    X_scaled = scaler.transform(X)
    predicted = model.predict(X_scaled)[0]
    predicted = max(1, min(10, predicted))

    return round(float(predicted), 2)


def interactive_input():
    print("\n--- Score a Jazz Track ---\n")
    track = {}
    track["title"] = input("Title: ").strip()
    track["artist"] = input("Artist: ").strip()
    track["energy"] = int(input("Energy (1-10): ").strip())
    track["tempo"] = input("Tempo (slow/medium/medium-fast/fast): ").strip()
    track["harmonic_complexity"] = input("Harmonic complexity (low/medium/high): ").strip()
    track["era"] = input("Era (Modal/Post-Bop/Cool Jazz/Hard Bop/Bebop/Swing): ").strip()
    track["primary_instrument"] = input("Primary instrument (tenor saxophone/piano/vocals/trumpet/bass/other): ").strip()
    track["year"] = int(input("Year: ").strip() or "1960")

    moods_input = input("Moods (comma-separated, e.g. romantic,tender,bluesy): ").strip()
    track["moods"] = [m.strip() for m in moods_input.split(",") if m.strip()]

    subgenres_input = input("Subgenres (comma-separated, e.g. hard bop,ballad): ").strip()
    track["subgenres"] = [s.strip() for s in subgenres_input.split(",") if s.strip()]

    return track


def display_result(track, score):
    title = track.get("title", "Unknown")
    artist = track.get("artist", "Unknown")

    if score >= 8.5:
        verdict = "STRONG RECOMMEND"
    elif score >= 7:
        verdict = "RECOMMEND"
    elif score >= 5.5:
        verdict = "MAYBE"
    else:
        verdict = "SKIP"

    print(f"\n  {title} — {artist}")
    print(f"  Predicted rating: {score}/10")
    print(f"  Verdict: {verdict}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Score jazz tracks against your taste model")
    parser.add_argument("--json", help="JSON string of a single track")
    parser.add_argument("--file", help="Path to JSON file with array of candidate tracks")
    args = parser.parse_args()

    model_data = load_model()

    if args.json:
        track = json.loads(args.json)
        score = predict_track(track, model_data)
        display_result(track, score)

    elif args.file:
        tracks = json.loads(Path(args.file).read_text())
        if isinstance(tracks, dict):
            tracks = [tracks]
        print(f"\nScoring {len(tracks)} tracks...\n")
        results = []
        for t in tracks:
            score = predict_track(t, model_data)
            results.append((t, score))
            display_result(t, score)

        results.sort(key=lambda x: x[1], reverse=True)
        print("--- Ranked ---")
        for t, s in results:
            print(f"  {s}/10  {t.get('title', '?')} — {t.get('artist', '?')}")

    else:
        track = interactive_input()
        score = predict_track(track, model_data)
        display_result(track, score)


if __name__ == "__main__":
    main()
