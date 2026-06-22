#!/usr/bin/env python3
"""
Score a candidate jazz track against the trained taste model.

Usage:
  Interactive:  python3 predict.py
  JSON input:   python3 predict.py --json '{"title":"Naima","energy":2,...}'
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
VERSIONS_DIR = SCRIPT_DIR / "versions"

TEMPO_MAP = {"slow": 1, "medium": 2, "medium-fast": 3, "fast": 4, "varied": 2.5}
COMPLEXITY_MAP = {"low": 1, "medium": 2, "high": 3}
INSTRUMENT_GROUPS = {
    "tenor saxophone": "tenor_sax", "saxophone": "tenor_sax",
    "soprano saxophone": "tenor_sax", "alto saxophone": "tenor_sax",
    "piano": "piano", "vocals": "vocals", "bass": "bass",
    "trumpet": "trumpet", "guitar": "guitar",
}
INST_GROUP_VALUES = ["tenor_sax", "piano", "vocals", "bass", "trumpet", "guitar", "other"]
DISCOVERY_SOURCES = ["self", "claude-recommendation", "autoplay"]
POSITIVE_MOODS = {
    "romantic", "tender", "sexy", "sensual", "captivating", "joyful", "cool",
    "bluesy", "groovy", "warm", "intimate", "lovely", "pretty", "hopeful",
    "spiritual", "meditative", "swinging", "cute", "lush", "gentle",
    "bittersweet", "melancholic", "mournful", "nostalgic", "moody", "dark",
    "haunting", "sparse", "spacious",
}
NEGATIVE_MOODS = {
    "flat", "uninteresting", "sleepy", "background", "repetitive", "corny",
    "showtimey", "dramatic", "restless", "experimental",
}


def load_model(version=None):
    if version:
        model_path = VERSIONS_DIR / f"v{version}" / "model.joblib"
    else:
        model_path = MODEL_PATH
    if not model_path.exists():
        print(f"No model found at {model_path}. Run `python3 train.py` first.")
        sys.exit(1)
    return joblib.load(model_path)


def track_to_features(track, model_data):
    feature_names = model_data["feature_names"]
    common_moods = model_data["common_moods"]
    common_subgenres = model_data["common_subgenres"]
    common_labels = model_data.get("common_labels", [])
    eras = model_data["eras"]

    row = {}
    row["energy"] = track.get("energy", 5)
    row["year"] = track.get("year") or 1960
    row["tempo"] = TEMPO_MAP.get(track.get("tempo", "medium"), 2.5)
    row["harmonic_complexity"] = COMPLEXITY_MAP.get(track.get("harmonic_complexity", "medium"), 2)

    # Era one-hot
    track_era = track.get("era", "Unknown")
    for era in eras:
        row[f"era_{era}"] = 1 if track_era == era else 0

    # Decade bucket
    yr = track.get("year") or 1960
    decade = f"{(yr // 10) * 10}s"
    for d in ["1940s", "1950s", "1960s", "1970s"]:
        row[f"decade_{d}"] = 1 if decade == d else 0

    instrument = track.get("primary_instrument", "other")
    group = INSTRUMENT_GROUPS.get(instrument, "other")
    for g in INST_GROUP_VALUES:
        row[f"inst_{g}"] = 1 if group == g else 0

    track_moods = track.get("moods", [])
    for m in common_moods:
        row[f"mood_{m}"] = 1 if m in track_moods else 0

    track_subgenres = track.get("subgenres", [])
    for s in common_subgenres:
        row[f"subgenre_{s}"] = 1 if s in track_subgenres else 0

    row["mood_count"] = len(track_moods)
    row["mood_polarity"] = sum(1 for m in track_moods if m in POSITIVE_MOODS) - sum(1 for m in track_moods if m in NEGATIVE_MOODS)
    pos_count = sum(1 for m in track_moods if m in POSITIVE_MOODS)
    row["mood_density_ratio"] = pos_count / max(len(track_moods), 1)
    row["has_negative_mood"] = int(any(m in NEGATIVE_MOODS for m in track_moods))
    row["subgenre_count"] = len(track_subgenres)

    instr_lower = [i.lower() for i in track.get("instrumentation", [])]
    instr_joined = " ".join(instr_lower)
    row["ensemble_size"] = len(instr_lower)
    row["has_guitar"] = int("guitar" in instr_joined)
    row["has_strings"] = int("strings" in instr_joined or "orchestra" in instr_joined)
    row["has_vocals"] = int("vocal" in instr_joined)
    row["is_pianoless"] = int("piano" not in instr_joined)
    row["has_trombone"] = int("trombone" in instr_joined)

    track_label = track.get("label")
    for l in common_labels:
        row[f"label_{l}"] = 1 if track_label == l else 0

    row["key_player_count"] = len(track.get("key_players", []))
    artist_name = track.get("artist", "").lower().split("&")[0].strip()
    row["artist_is_leader"] = int(any(artist_name in kp.lower() for kp in track.get("key_players", [])))

    # Collaborator quality
    row["collaborator_quality"] = track.get("collaborator_quality", 6.6)

    source = track.get("discovered_from", "claude-recommendation")
    for s in DISCOVERY_SOURCES:
        row[f"source_{s}"] = 1 if source == s else 0

    row["energy_tempo"] = row["energy"] * row["tempo"]

    row["artist_mean_rating"] = track.get("artist_mean_rating", 6.6)
    row["artist_consistency"] = track.get("artist_consistency", 0.0)
    row["artist_track_count"] = track.get("artist_track_count", 1)

    # Duration bucket
    duration = (track.get("audio_features") or {}).get("duration_s", 300)
    row["duration_short"] = int(duration < 240)
    row["duration_long"] = int(duration > 420)
    row["duration_extra_long"] = int(duration > 600)

    # Electric / acoustic / format detection
    row["is_electric"] = int(any(k in instr_joined for k in ["electric", "synth", "clavinet", "organ", "fender", "rhodes"]))
    row["is_solo_piano"] = int(track.get("primary_instrument") == "piano" and len(instr_lower) <= 2)
    row["has_horn_section"] = int(sum(1 for i in instr_lower if any(h in i for h in ["trumpet", "trombone", "sax", "cornet", "flute", "clarinet"])) >= 3)
    row["is_collaboration"] = int("&" in track.get("artist", "") or "," in track.get("artist", ""))
    row["instrumentation_diversity"] = len(set(INSTRUMENT_GROUPS.get(i, i) for i in instr_lower))

    # Artist novelty
    row["artist_is_new"] = int(track.get("artist_track_count", 1) == 1)

    # Mood interactions
    row["energy_x_complexity"] = row["energy"] * row["harmonic_complexity"]
    row["mood_polarity_x_energy"] = row["mood_polarity"] * row["energy"]

    # Key/mode features
    mode = ((track.get("audio_features") or {}).get("mode") or "").lower()
    row["is_minor_key"] = int(mode in ["minor", "dorian", "blues", "phrygian"])
    row["is_dorian"] = int(mode == "dorian")

    audio = track.get("audio_features") or {}
    has_audio = "duration_s" in audio
    if has_audio:
        row["duration_s"] = audio.get("duration_s", 300)
        row["popularity"] = audio.get("popularity", 50)
        row["tempo_bpm"] = audio.get("tempo_bpm", 120)
        row["time_signature"] = audio.get("time_signature", 4)
        row["is_live"] = int(audio.get("is_live", False))

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
    track["primary_instrument"] = input("Primary instrument: ").strip()
    track["year"] = int(input("Year: ").strip() or "1960")
    track["label"] = input("Label (or blank): ").strip() or None

    moods_input = input("Moods (comma-separated): ").strip()
    track["moods"] = [m.strip() for m in moods_input.split(",") if m.strip()]

    subgenres_input = input("Subgenres (comma-separated): ").strip()
    track["subgenres"] = [s.strip() for s in subgenres_input.split(",") if s.strip()]

    instr_input = input("Instrumentation (comma-separated): ").strip()
    track["instrumentation"] = [i.strip() for i in instr_input.split(",") if i.strip()]

    players_input = input("Key players (comma-separated): ").strip()
    track["key_players"] = [p.strip() for p in players_input.split(",") if p.strip()]

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
    parser.add_argument("--version", help="Load model from a specific major version (e.g., '1.00')")
    args = parser.parse_args()

    model_data = load_model(version=args.version)

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
