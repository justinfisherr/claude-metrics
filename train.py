import json
import re
import os
import argparse
import shutil
import joblib
from datetime import datetime, date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import RidgeCV
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from scipy.stats import pearsonr

SCRIPT_DIR = Path(__file__).parent
TRAINING_DATA_PATH = SCRIPT_DIR / "training-data.json"
OUTPUT_PATH = SCRIPT_DIR / "dashboard-data.json"
MODEL_PATH = SCRIPT_DIR / "model.joblib"
VERSIONS_PATH = SCRIPT_DIR / "versions.json"
VERSIONS_DIR = SCRIPT_DIR / "versions"

TEMPO_MAP = {"slow": 1, "medium": 2, "medium-fast": 3, "fast": 4, "varied": 2.5}
COMPLEXITY_MAP = {"low": 1, "medium": 2, "high": 3}
INSTRUMENT_GROUPS = {
    "tenor saxophone": "tenor_sax", "saxophone": "tenor_sax",
    "soprano saxophone": "tenor_sax", "alto saxophone": "tenor_sax",
    "piano": "piano",
    "vocals": "vocals",
    "bass": "bass",
    "trumpet": "trumpet",
    "guitar": "guitar",
}
INST_GROUP_VALUES = ["tenor_sax", "piano", "vocals", "bass", "trumpet", "guitar", "other"]
DISCOVERY_SOURCES = ["self", "claude-recommendation", "autoplay"]
MOOD_AXES_PATH = SCRIPT_DIR / "mood-axes.json"
MOOD_AXES = json.loads(MOOD_AXES_PATH.read_text()) if MOOD_AXES_PATH.exists() else {}
MOOD_THRESHOLD = 3
SUBGENRE_THRESHOLD = 3
LABEL_THRESHOLD = 3


def load_data():
    all_entries = json.loads(TRAINING_DATA_PATH.read_text())
    today = date.today().isoformat()
    dirty = False
    for entry in all_entries:
        if not entry.get("date_added"):
            entry["date_added"] = today
            dirty = True
    if dirty:
        TRAINING_DATA_PATH.write_text(json.dumps(all_entries, indent=2, ensure_ascii=False))
    tracks = [t for t in all_entries if t.get("entity_type") != "album"]
    albums = [t for t in all_entries if t.get("entity_type") == "album"]
    return tracks, albums


def engineer_features(tracks):
    rows = []
    all_moods = {}
    all_subgenres = {}
    all_labels = {}

    for t in tracks:
        for m in t.get("moods", []):
            all_moods[m] = all_moods.get(m, 0) + 1
        for s in t.get("subgenres", []):
            all_subgenres[s] = all_subgenres.get(s, 0) + 1
        label = t.get("label")
        if label:
            all_labels[label] = all_labels.get(label, 0) + 1

    common_moods = sorted([m for m, c in all_moods.items() if c >= MOOD_THRESHOLD])
    common_subgenres = sorted([s for s, c in all_subgenres.items() if c >= SUBGENRE_THRESHOLD])
    common_labels = sorted([l for l, c in all_labels.items() if c >= LABEL_THRESHOLD])

    eras = sorted(set(t.get("era", "Unknown") for t in tracks))

    artist_track_indices = {}
    for i, t in enumerate(tracks):
        artist_track_indices.setdefault(t.get("artist", "Unknown"), []).append(i)
    global_mean = np.mean([t["rating"] for t in tracks])

    has_audio = sum(1 for t in tracks if t.get("audio_features")) >= 3

    # Pre-compute artist stats and collaborator ratings for LOO encoding
    artist_ratings = {}
    for i, t in enumerate(tracks):
        artist_ratings.setdefault(t.get("artist", "Unknown"), []).append((i, t["rating"]))

    player_ratings = {}
    for t in tracks:
        for kp in t.get("key_players", []):
            name = kp.split(" - ")[0].strip().lower()
            player_ratings.setdefault(name, []).append(t["rating"])

    for idx, t in enumerate(tracks):
        row = {}
        row["energy"] = t.get("energy", 5)
        row["year"] = t.get("year") or 1960
        row["tempo"] = TEMPO_MAP.get(t.get("tempo", "medium"), 2.5)
        row["harmonic_complexity"] = COMPLEXITY_MAP.get(t.get("harmonic_complexity", "medium"), 2)

        # Era one-hot
        track_era = t.get("era", "Unknown")
        for era in eras:
            row[f"era_{era}"] = 1 if track_era == era else 0

        # Decade bucket one-hot
        yr = t.get("year") or 1960
        decade = f"{(yr // 10) * 10}s"
        for d in ["1940s", "1950s", "1960s", "1970s"]:
            row[f"decade_{d}"] = 1 if decade == d else 0

        # Instrument
        instrument = t.get("primary_instrument", "other")
        group = INSTRUMENT_GROUPS.get(instrument, "other")
        for g in INST_GROUP_VALUES:
            row[f"inst_{g}"] = 1 if group == g else 0

        # Moods
        track_moods = t.get("moods", [])
        for m in common_moods:
            row[f"mood_{m}"] = 1 if m in track_moods else 0

        # Subgenres
        track_subgenres = t.get("subgenres", [])
        for s in common_subgenres:
            row[f"subgenre_{s}"] = 1 if s in track_subgenres else 0

        row["mood_count"] = len(track_moods)
        axes_vals = [MOOD_AXES[m] for m in track_moods if m in MOOD_AXES]
        if axes_vals:
            row["avg_valence"] = np.mean([a["valence"] for a in axes_vals])
            row["avg_arousal"] = np.mean([a["arousal"] for a in axes_vals])
            row["avg_dominance"] = np.mean([a["dominance"] for a in axes_vals])
        else:
            row["avg_valence"] = 0.0
            row["avg_arousal"] = 0.0
            row["avg_dominance"] = 0.0
        row["subgenre_count"] = len(track_subgenres)

        # Ensemble / instrumentation
        instr_lower = [i.lower() for i in t.get("instrumentation", [])]
        instr_joined = " ".join(instr_lower)
        row["ensemble_size"] = len(instr_lower)
        row["has_guitar"] = int("guitar" in instr_joined)
        row["has_strings"] = int("strings" in instr_joined or "orchestra" in instr_joined)
        row["has_vocals"] = int("vocal" in instr_joined)
        row["is_pianoless"] = int("piano" not in instr_joined)
        row["has_trombone"] = int("trombone" in instr_joined)

        # Label
        track_label = t.get("label")
        for l in common_labels:
            row[f"label_{l}"] = 1 if track_label == l else 0

        # Key players
        row["key_player_count"] = len(t.get("key_players", []))
        artist_name = t.get("artist", "").lower().split("&")[0].strip()
        row["artist_is_leader"] = int(any(artist_name in kp.lower() for kp in t.get("key_players", [])))

        # Collaborator quality — avg rating of tracks featuring each key player (LOO)
        collab_ratings = []
        for kp in t.get("key_players", []):
            name = kp.split(" - ")[0].strip().lower()
            pr = player_ratings.get(name, [])
            if len(pr) > 1:
                collab_ratings.extend([r for r in pr if r != t["rating"] or len(pr) > pr.count(t["rating"])])
        row["collaborator_quality"] = np.mean(collab_ratings) if collab_ratings else global_mean

        # Discovery source
        source = t.get("discovered_from", "self")
        for s in DISCOVERY_SOURCES:
            row[f"source_{s}"] = 1 if source == s else 0

        row["energy_tempo"] = row["energy"] * row["tempo"]

        # Artist stats (LOO)
        artist = t.get("artist", "Unknown")
        artist_entries = artist_ratings[artist]
        if len(artist_entries) > 1:
            other_ratings = [r for i, r in artist_entries if i != idx]
            row["artist_mean_rating"] = np.mean(other_ratings)
            row["artist_consistency"] = float(np.std(other_ratings)) if len(other_ratings) > 1 else 0.0
        else:
            row["artist_mean_rating"] = global_mean
            row["artist_consistency"] = 0.0
        row["artist_track_count"] = len(artist_entries)

        # Duration bucket
        duration = (t.get("audio_features") or {}).get("duration_s", 300)
        row["duration_short"] = int(duration < 240)
        row["duration_long"] = int(duration > 420)
        row["duration_extra_long"] = int(duration > 600)

        # Electric / acoustic / format detection
        row["is_electric"] = int(any(k in instr_joined for k in ["electric", "synth", "clavinet", "organ", "fender", "rhodes"]))
        row["is_solo_piano"] = int(instrument == "piano" and len(instr_lower) <= 2)
        row["has_horn_section"] = int(sum(1 for i in instr_lower if any(h in i for h in ["trumpet", "trombone", "sax", "cornet", "flute", "clarinet"])) >= 3)
        row["is_collaboration"] = int("&" in t.get("artist", "") or "," in t.get("artist", ""))
        row["instrumentation_diversity"] = len(set(INSTRUMENT_GROUPS.get(i, i) for i in instr_lower))

        # Artist novelty — first time hearing this artist
        row["artist_is_new"] = int(len(artist_entries) == 1)

        # Mood interactions
        row["energy_x_complexity"] = row["energy"] * row["harmonic_complexity"]
        row["valence_x_energy"] = row["avg_valence"] * row["energy"]
        row["valence_x_arousal"] = row["avg_valence"] * row["avg_arousal"]
        row["arousal_x_energy"] = row["avg_arousal"] * row["energy"]

        # Key/mode features
        audio_pre = t.get("audio_features") or {}
        mode = (audio_pre.get("mode") or "").lower()
        row["is_minor_key"] = int(mode in ["minor", "dorian", "blues", "phrygian"])
        row["is_dorian"] = int(mode == "dorian")

        if has_audio:
            audio = t.get("audio_features") or {}
            has_recco = audio.get("acousticness") is not None

            # User-entered fields — always included when present
            row["duration_s"]     = audio.get("duration_s") or 300
            row["popularity"]     = audio.get("popularity") or 50
            row["tempo_bpm"]      = audio.get("tempo_bpm") or 120
            row["time_signature"] = audio.get("time_signature") or 4
            row["is_live"]        = int(audio.get("is_live") or False)

            # ReccoBeats fields — real values when available, neutral defaults otherwise.
            # has_recco_features lets the model discount those 12 tracks' audio values.
            row["has_recco_features"] = int(has_recco)
            row["acousticness"]       = audio["acousticness"]     if has_recco else 0.5
            row["danceability"]       = audio["danceability"]     if has_recco else 0.5
            row["spotify_energy"]     = audio["spotify_energy"]   if has_recco else 0.5
            row["instrumentalness"]   = audio["instrumentalness"] if has_recco else 0.5
            row["liveness"]           = audio["liveness"]         if has_recco else 0.15
            row["loudness"]           = audio["loudness"]         if has_recco else -10.0
            row["speechiness"]        = audio["speechiness"]      if has_recco else 0.05
            row["spotify_valence"]    = audio["spotify_valence"]  if has_recco else 0.5

        rows.append(row)

    df = pd.DataFrame(rows)
    ratings = pd.Series([t["rating"] for t in tracks])
    feature_names = list(df.columns)

    return df, ratings, feature_names, common_moods, common_subgenres, common_labels


def readable_name(feat):
    NAMES = {
        "energy": "Energy",
        "year": "Year",
        "tempo": "Tempo",
        "harmonic_complexity": "Harmonic Complexity",
        "mood_count": "Mood Count",
        "subgenre_count": "Subgenre Count",
        "energy_tempo": "Energy × Tempo",
        "artist_mean_rating": "Artist Avg Rating",
        "artist_track_count": "Artist Track Count",
        "ensemble_size": "Ensemble Size",
        "has_guitar": "Has Guitar",
        "has_strings": "Has Strings",
        "has_vocals": "Has Vocals",
        "is_pianoless": "Pianoless",
        "has_trombone": "Has Trombone",
        "key_player_count": "Key Player Count",
        "avg_valence": "Mood Valence",
        "avg_arousal": "Mood Arousal",
        "avg_dominance": "Mood Dominance",
        "valence_x_energy": "Valence × Energy",
        "valence_x_arousal": "Valence × Arousal",
        "arousal_x_energy": "Arousal × Energy",
        "replayability": "Replayability",
        "has_favorite_moments": "Has Fav Moments",
        "duration_s": "Duration",
        "popularity": "Spotify Popularity",
        "tempo_bpm": "Tempo (BPM)",
        "time_signature": "Time Signature",
        "is_live": "Live Recording",
        "has_recco_features": "Has ReccoBeats Features",
        "acousticness": "Acousticness",
        "danceability": "Danceability",
        "spotify_energy": "Audio Energy (Spotify)",
        "instrumentalness": "Instrumentalness",
        "liveness": "Liveness Score",
        "loudness": "Loudness (dB)",
        "speechiness": "Speechiness",
        "spotify_valence": "Audio Valence (Spotify)",
    }
    if feat in NAMES:
        return NAMES[feat]
    if feat.startswith("mood_"):
        return f'"{feat[5:].title()}" mood'
    if feat.startswith("subgenre_"):
        return f'"{feat[9:].replace("_", " ").title()}" subgenre'
    if feat.startswith("era_"):
        return f"{feat[4:]} era"
    if feat.startswith("inst_"):
        return f"{feat[5:].replace('_', ' ').title()} instrument"
    if feat.startswith("label_"):
        return f"{feat[6:]} label"
    if feat.startswith("source_"):
        return f'"{feat[7:]}" source'
    return feat.replace("_", " ").title()


def train_models(X, y):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    ridge = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0], cv=LeaveOneOut())
    ridge.fit(X_scaled, y)
    ridge_preds = np.zeros(len(y))
    loo = LeaveOneOut()
    for train_idx, test_idx in loo.split(X_scaled):
        r = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0])
        r.fit(X_scaled[train_idx], y.iloc[train_idx])
        ridge_preds[test_idx] = r.predict(X_scaled[test_idx])

    ridge_metrics = {
        "r_squared": round(r2_score(y, ridge_preds), 4),
        "rmse": round(np.sqrt(mean_squared_error(y, ridge_preds)), 4),
        "mae": round(mean_absolute_error(y, ridge_preds), 4),
        "best_alpha": float(ridge.alpha_),
    }

    rf = RandomForestRegressor(n_estimators=50, max_depth=3, min_samples_leaf=5, random_state=42)
    rf_preds = cross_val_predict(rf, X_scaled, y, cv=LeaveOneOut())
    rf.fit(X_scaled, y)

    rf_metrics = {
        "r_squared": round(r2_score(y, rf_preds), 4),
        "rmse": round(np.sqrt(mean_squared_error(y, rf_preds)), 4),
        "mae": round(mean_absolute_error(y, rf_preds), 4),
        "max_depth": 3,
        "n_estimators": 50,
    }

    best = "ridge" if ridge_metrics["r_squared"] >= rf_metrics["r_squared"] else "random_forest"

    coefs = np.abs(ridge.coef_)
    ridge_importance = coefs / coefs.max() if coefs.max() > 0 else coefs
    ridge_directions = np.sign(ridge.coef_)

    rf_importance = rf.feature_importances_

    return {
        "ridge": ridge_metrics,
        "random_forest": rf_metrics,
        "best_model": best,
        "ridge_preds": ridge_preds,
        "rf_preds": rf_preds,
        "ridge_importance": ridge_importance,
        "ridge_directions": ridge_directions,
        "rf_importance": rf_importance,
        "scaler": scaler,
        "X_scaled": X_scaled,
    }


def get_feature_importance(model_results, feature_names, top_n=15):
    best = model_results["best_model"]
    if best == "ridge":
        importance = model_results["ridge_importance"]
        directions = model_results["ridge_directions"]
    else:
        importance = model_results["rf_importance"]
        directions = np.zeros(len(importance))

    indices = np.argsort(importance)[::-1][:top_n]
    return [
        {
            "feature": readable_name(feature_names[i]),
            "importance": round(float(importance[i]), 4),
            "direction": "positive" if directions[i] >= 0 else "negative",
        }
        for i in indices
    ]


def compute_correlations(X, y, feature_names, top_n=10):
    feature_rating = []
    for i, name in enumerate(feature_names):
        col = X.iloc[:, i]
        if col.std() == 0:
            continue
        r, p = pearsonr(col, y)
        feature_rating.append({
            "feature": readable_name(name),
            "correlation": round(float(r), 4),
            "p_value": round(float(p), 4),
        })
    feature_rating.sort(key=lambda x: abs(x["correlation"]), reverse=True)

    top_features = [f["feature"] for f in feature_rating[:top_n]]
    top_indices = []
    for f in feature_rating[:top_n]:
        for i, name in enumerate(feature_names):
            if readable_name(name) == f["feature"]:
                top_indices.append(i)
                break

    cols = [y] + [X.iloc[:, i] for i in top_indices]
    labels = ["Rating"] + top_features
    matrix = np.corrcoef(np.array([c.values for c in cols]))

    return {
        "feature_rating": feature_rating,
        "heatmap": {
            "labels": labels,
            "matrix": [[round(float(v), 3) for v in row] for row in matrix],
        },
    }


def cluster_analysis(X_scaled, tracks, feature_names):
    pca_full = PCA(n_components=min(X_scaled.shape[1], X_scaled.shape[0] - 1))
    pca_full.fit(X_scaled)
    cumvar = np.cumsum(pca_full.explained_variance_ratio_)
    n_components = int(np.searchsorted(cumvar, 0.95) + 1)
    n_components = max(2, min(n_components, X_scaled.shape[0] - 1))

    pca = PCA(n_components=n_components)
    X_pca = pca.fit_transform(X_scaled)

    pca_2d = PCA(n_components=2)
    coords = pca_2d.fit_transform(X_scaled)

    results = {"k_values_tested": [], "silhouette_scores": [], "inertias": []}
    best_k, best_score, best_labels = 2, -1, None

    for k in [2, 3, 4]:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_pca)

        cluster_sizes = [int(np.sum(labels == c)) for c in range(k)]
        if min(cluster_sizes) < 8:
            results["k_values_tested"].append(k)
            results["silhouette_scores"].append(0)
            results["inertias"].append(float(km.inertia_))
            continue

        score = silhouette_score(X_pca, labels)
        results["k_values_tested"].append(k)
        results["silhouette_scores"].append(round(float(score), 4))
        results["inertias"].append(round(float(km.inertia_), 2))

        if score > best_score:
            best_k, best_score, best_labels = k, score, labels

    if best_labels is None:
        km = KMeans(n_clusters=2, random_state=42, n_init=10)
        best_labels = km.fit_predict(X_pca)
        best_k = 2
        best_score = silhouette_score(X_pca, best_labels)

    results["best_k"] = best_k

    radar_moods = ["romantic", "tender", "joyful", "bluesy", "cool", "melancholic", "sensual"]
    radar_labels = ["Energy", "Complexity", "Tempo"] + [m.title() for m in radar_moods]

    profiles = []
    for c in range(best_k):
        mask = best_labels == c
        cluster_tracks = [tracks[i] for i in range(len(tracks)) if mask[i]]
        cluster_ratings = [t["rating"] for t in cluster_tracks]

        mood_counts = {}
        era_counts = {}
        tempo_counts = {}
        for t in cluster_tracks:
            for m in t.get("moods", []):
                mood_counts[m] = mood_counts.get(m, 0) + 1
            era_counts[t.get("era", "Unknown")] = era_counts.get(t.get("era", "Unknown"), 0) + 1
            tempo_counts[t.get("tempo", "medium")] = tempo_counts.get(t.get("tempo", "medium"), 0) + 1

        top_moods = sorted(mood_counts, key=mood_counts.get, reverse=True)[:5]
        top_eras = sorted(era_counts, key=era_counts.get, reverse=True)[:3]
        dominant_tempo = max(tempo_counts, key=tempo_counts.get)

        mean_energy = np.mean([t.get("energy", 5) for t in cluster_tracks])
        mean_complexity = np.mean([COMPLEXITY_MAP.get(t.get("harmonic_complexity", "medium"), 2) for t in cluster_tracks])
        mean_tempo = np.mean([TEMPO_MAP.get(t.get("tempo", "medium"), 2.5) for t in cluster_tracks])

        radar_values = [mean_energy / 10, mean_complexity / 3, mean_tempo / 4]
        for mood in radar_moods:
            mood_freq = sum(1 for t in cluster_tracks if mood in t.get("moods", [])) / len(cluster_tracks)
            radar_values.append(round(mood_freq, 3))

        dists = np.linalg.norm(coords[mask] - coords[mask].mean(axis=0), axis=1)
        rep_indices = np.argsort(dists)[:3]
        representative = [cluster_tracks[i]["title"] for i in rep_indices]

        profiles.append({
            "id": int(c),
            "label": f"Cluster {c}",
            "size": int(mask.sum()),
            "mean_rating": round(float(np.mean(cluster_ratings)), 2),
            "mean_energy": round(float(mean_energy), 2),
            "top_moods": top_moods,
            "top_eras": top_eras,
            "dominant_tempo": dominant_tempo,
            "mean_complexity": round(float(mean_complexity), 2),
            "representative_tracks": representative,
            "radar": {
                "labels": radar_labels,
                "values": [round(float(v), 3) for v in radar_values],
            },
        })

    results["cluster_profiles"] = profiles

    return results, best_labels, coords


def build_predictions(tracks, model_results, best_labels, coords):
    best = model_results["best_model"]
    preds = model_results["ridge_preds"] if best == "ridge" else model_results["rf_preds"]

    results = []
    for i, t in enumerate(tracks):
        audio = t.get("audio_features") or {}
        results.append({
            "title": t["title"],
            "artist": t["artist"],
            "actual": t["rating"],
            "predicted": round(float(preds[i]), 2),
            "residual": round(float(t["rating"] - preds[i]), 2),
            "cluster": int(best_labels[i]),
            "liked": t.get("liked", True),
            "pca_x": round(float(coords[i, 0]), 4),
            "pca_y": round(float(coords[i, 1]), 4),
            "year": t.get("year"),
            "energy": t.get("energy", 5),
            "tempo": t.get("tempo", "medium"),
            "era": t.get("era", "Unknown"),
            "moods": t.get("moods", []),
            "key": audio.get("key"),
            "mode": audio.get("mode"),
            "duration_s": audio.get("duration_s"),
            "popularity": audio.get("popularity"),
            "replayability": t.get("replayability"),
            "playthrough": t.get("playthrough"),
            "primary_instrument": t.get("primary_instrument"),
            "label": t.get("label"),
            "harmonic_complexity": t.get("harmonic_complexity"),
            "discovered_from": t.get("discovered_from"),
            "ensemble_size": len(t.get("instrumentation") or []),
            "is_pianoless": int("piano" not in " ".join(t.get("instrumentation") or []).lower()),
            "has_vocals": int("vocal" in " ".join(t.get("instrumentation") or []).lower()),
            "has_guitar": int("guitar" in " ".join(t.get("instrumentation") or []).lower()),
            "avg_valence": round(np.mean([MOOD_AXES[m]["valence"] for m in t.get("moods", []) if m in MOOD_AXES]) if any(m in MOOD_AXES for m in t.get("moods", [])) else 0.0, 3),
            "avg_arousal": round(np.mean([MOOD_AXES[m]["arousal"] for m in t.get("moods", []) if m in MOOD_AXES]) if any(m in MOOD_AXES for m in t.get("moods", [])) else 0.0, 3),
            "avg_dominance": round(np.mean([MOOD_AXES[m]["dominance"] for m in t.get("moods", []) if m in MOOD_AXES]) if any(m in MOOD_AXES for m in t.get("moods", [])) else 0.0, 3),
            "artist_is_leader": int(any(t.get("artist", "").lower().split("&")[0].strip() in kp.lower() for kp in t.get("key_players", []))),
            "liked": t.get("liked"),
            "intro_grabbed": int(any(kw in (t.get("favorite_moments") or "").lower() + " " + (t.get("notes") or "").lower() + " " + " ".join(t.get("notable_qualities", [])).lower() for kw in ["intro", "right away"])),
            "early_bail": int((t.get("playthrough") or 0.75) < 0.3),
        })
    return results


def build_distributions(tracks, best_labels):
    ratings = [t["rating"] for t in tracks]
    bins = sorted(set(ratings))
    counts = [ratings.count(b) for b in bins]

    by_cluster = {}
    for i, t in enumerate(tracks):
        c = int(best_labels[i])
        by_cluster.setdefault(c, []).append(t["rating"])

    ratings_by_cluster = [
        {"cluster": c, "ratings": sorted(rs)} for c, rs in sorted(by_cluster.items())
    ]

    return {"ratings": {"bins": bins, "counts": counts}, "ratings_by_cluster": ratings_by_cluster}


def load_history():
    if OUTPUT_PATH.exists():
        try:
            data = json.loads(OUTPUT_PATH.read_text())
            return data.get("history", [])
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def load_versions():
    if VERSIONS_PATH.exists():
        return json.loads(VERSIONS_PATH.read_text())
    return {"current_version": "0.99", "versions": []}


def next_version(manifest, is_major=False):
    current = manifest["current_version"]
    major, minor = current.split(".")
    major, minor = int(major), int(minor)
    if is_major:
        return f"{major + 1}.00"
    return f"{major}.{minor + 1:02d}"


def save_version_artifacts(version_str, manifest, metrics_summary, is_major, name="", notes="", changelog=None):
    artifacts = {
        "dashboard_data": "dashboard-data.json",
        "model": "model.joblib",
    }

    if is_major:
        version_dir = VERSIONS_DIR / f"v{version_str}"
        version_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUTPUT_PATH, version_dir / "dashboard-data.json")
        shutil.copy2(MODEL_PATH, version_dir / "model.joblib")
        shutil.copy2(TRAINING_DATA_PATH, version_dir / "training-data.md")
        artifacts = {
            "dashboard_data": f"versions/v{version_str}/dashboard-data.json",
            "model": f"versions/v{version_str}/model.joblib",
            "training_data": f"versions/v{version_str}/training-data.md",
        }

    major, minor = version_str.split(".")
    version_entry = {
        "version": version_str,
        "name": name,
        "major": int(major),
        "minor": int(minor),
        "run_date": datetime.now().isoformat(),
        "dataset_size": metrics_summary["dataset_size"],
        "best_model": metrics_summary["best_model"],
        "r_squared": metrics_summary["r_squared"],
        "rmse": metrics_summary["rmse"],
        "mae": metrics_summary["mae"],
        "feature_count": metrics_summary["feature_count"],
        "best_k": metrics_summary["best_k"],
        "notes": notes,
        "changelog": changelog or [],
        "is_major": is_major,
        "training_data_snapshot": is_major,
        "artifacts": artifacts,
    }

    manifest["versions"].append(version_entry)
    manifest["current_version"] = version_str
    VERSIONS_PATH.write_text(json.dumps(manifest, indent=2))
    return version_str


def extract_rating_changes(tracks, albums):
    """Extract tracks/albums where rating has been changed"""
    all_items = tracks + albums
    changes = []

    for item in all_items:
        history = item.get("rating_history")
        if history and len(history) > 1:
            old_rating = history[-2]["rating"]
            new_rating = history[-1]["rating"]
            change = new_rating - old_rating
            direction = "improved" if change > 0 else "downgraded"

            changes.append({
                "title": item.get("title"),
                "artist": item.get("artist"),
                "old_rating": old_rating,
                "new_rating": new_rating,
                "change": change,
                "direction": direction,
                "change_date": history[-1]["date"],
                "is_album": item.get("entity_type") == "album",
                "history": history,
                "times_changed": len(history) - 1,
            })

    # Sort by date descending
    changes.sort(key=lambda x: x["change_date"], reverse=True)

    # Compute trend
    by_date = {}
    for c in changes:
        date = c["change_date"]
        if date not in by_date:
            by_date[date] = {"improved": 0, "downgraded": 0}
        by_date[date][c["direction"]] += 1

    trend = [
        {"date": date, "improved": counts["improved"], "downgraded": counts["downgraded"]}
        for date, counts in sorted(by_date.items())
    ]

    return {
        "changes": changes,
        "trend": trend,
        "total_improvements": sum(1 for c in changes if c["direction"] == "improved"),
        "total_downgrades": sum(1 for c in changes if c["direction"] == "downgraded"),
    }


PLAYLISTS = [
    {"name": "My Top Jazz Songs", "id": "4ZnOuGzizWM1UIPZlhCAae", "tracks": [
        "My Favorite Things|John Coltrane",
        "Love Theme from Spartacus|Yusef Lateef",
        "So What|Miles Davis",
        "Peace Piece|Bill Evans",
        "Goodbye Pork Pie Hat|Charles Mingus",
        "Fleurette Africaine|Duke Ellington",
        "Mercy, Mercy, Mercy|Cannonball Adderley",
        "Chameleon|Herbie Hancock",
        "Blue Train|John Coltrane",
        "Wild Is The Wind|Nina Simone",
        "God Bless the Child|Sonny Rollins",
        "Tezeta|Mulatu Astatke",
        "Better Git It in Your Soul|Charles Mingus",
        "It Never Entered My Mind|Miles Davis",
        "Blue in Green|Miles Davis",
        "Moanin'|Mingus Big Band",
        "St. Thomas|Sonny Rollins",
        "Strode Rode|Sonny Rollins",
        "Equinox|John Coltrane",
        "Naima|John Coltrane",
        "A Single Petal of a Rose|Duke Ellington",
        "Open Letter to Duke|Charles Mingus",
    ]},
    {"name": "Jazz Date", "id": "6n2kibGIYXV5L3flumoiDw", "tracks": [
        "God Bless the Child|Sonny Rollins",
        "Love Theme from Spartacus|Yusef Lateef",
        "Goodbye Pork Pie Hat|Charles Mingus",
        "Peace Piece|Bill Evans",
        "It Never Entered My Mind|Miles Davis",
        "Blue in Green|Miles Davis",
        "Naima|John Coltrane",
        "Infant Eyes|Wayne Shorter",
        "What Are You Doing the Rest of Your Life|Bill Evans",
        "My Foolish Heart|Bill Evans",
        "A Single Petal of a Rose|Duke Ellington",
        "In a Sentimental Mood|Sonny Rollins",
        "Love Theme From The Robe|Yusef Lateef",
        "To Her Ladyship|John Coltrane",
        "'Round Midnight|McCoy Tyner",
        "Embraceable You|Barry Harris",
        "Lover Man|Charlie Parker",
        "Theme for Lester Young|Charles Mingus",
        "My One and Only Love|John Coltrane",
        "Fleurette Africaine|Duke Ellington",
        "Chelsea Bridge|Ben Webster",
    ]},
    {"name": "Jazz Stank", "id": "2Dj3wiGXPwGL3RjQDa6zG5", "tracks": [
        "Better Git It in Your Soul|Charles Mingus",
        "Moanin'|Mingus Big Band",
        "Boogie Stop Shuffle|Charles Mingus",
        "Fables of Faubus|Charles Mingus",
        "Open Letter to Duke|Charles Mingus",
        "Early Summer|Ryo Fukui",
        "Moanin'|Art Blakey & The Jazz Messengers",
    ]},
    {"name": "Jazz Vocals", "id": "5MffriQAGUbFt2DcfkgYuU", "tracks": [
        "My Funny Valentine|Chet Baker",
        "Wild Is The Wind|Nina Simone",
        "Solitude|Billie Holiday",
        "Crazy He Calls Me|Billie Holiday",
        "Lover Man|Billie Holiday",
        "Don't Let Me Be Misunderstood|Nina Simone",
        "Tryin' Times|Roberta Flack",
    ]},
    {"name": "Jazz Pool", "id": "3cnlae8AntzgbgmzdxRZOj", "tracks": [
        "All the Things You Are|Dizzy Gillespie",
        "It Never Entered My Mind|Miles Davis",
        "Tezeta|Mulatu Astatke",
        "Wild Is The Wind|Nina Simone",
        "Solitude|Billie Holiday",
        "Crazy He Calls Me|Billie Holiday",
        "Love Theme From The Robe|Yusef Lateef",
        "Moanin'|Mingus Big Band",
        "Love Theme from Spartacus|Yusef Lateef",
        "My Favorite Things|John Coltrane",
        "Lover Man|Charlie Parker",
        "In a Sentimental Mood|Duke Ellington",
        "To Her Ladyship|John Coltrane",
        "The Bridge|Sonny Rollins",
        "In a Sentimental Mood|Sonny Rollins",
        "St. Thomas|Sonny Rollins",
        "Strode Rode|Sonny Rollins",
        "Blue Train|John Coltrane",
        "Goodbye Pork Pie Hat|Charles Mingus",
        "A Single Petal of a Rose|Duke Ellington",
        "All of Me|Charlie Parker",
        "April In Paris|Charlie Parker",
        "Infant Eyes|Wayne Shorter",
        "Peace Piece|Bill Evans",
        "So What|Miles Davis",
        "Blue in Green|Miles Davis",
        "Tryin' Times|Roberta Flack",
        "Don't Let Me Be Misunderstood|Nina Simone",
        "Lover Man|Billie Holiday",
        "Embraceable You|Barry Harris",
        "My Foolish Heart|Bill Evans",
        "Early Summer|Ryo Fukui",
        "Better Git It in Your Soul|Charles Mingus",
        "Naima|John Coltrane",
        "Equinox|John Coltrane",
        "My Funny Valentine|Chet Baker",
        "What Are You Doing the Rest of Your Life|Bill Evans",
        "In Your Own Sweet Way|Wes Montgomery",
        "Open Letter to Duke|Charles Mingus",
        "Boogie Stop Shuffle|Charles Mingus",
        "Fables of Faubus|Charles Mingus",
        "My One and Only Love|John Coltrane",
        "Moanin'|Art Blakey & The Jazz Messengers",
        "Blue Moon|Julie London",
        "Cantaloupe Island|Herbie Hancock",
        "Mercy, Mercy, Mercy|Cannonball Adderley",
        "Fleurette Africaine|Duke Ellington",
        "Waltz for Debby|Bill Evans",
        "You Don't Know What Love Is|Miles Davis",
        "Django|The Modern Jazz Quartet",
        "God Bless the Child|Sonny Rollins",
        "Chelsea Bridge|Ben Webster",
        "Chameleon|Herbie Hancock",
        "Autumn Leaves|Stan Getz",
    ]},
]


def _normalize(s):
    s = s.lower()
    s = re.sub(r"\s*[-–—]\s*(remastered|remaster)(\s+\d{4})?\s*$", "", s)
    s = re.sub(r"[‘’.,!?]", "", s)
    s = re.sub(r"\s*&\s*(the\s+)?", " ", s)
    s = re.sub(r"\s*(trio|quartet|quintet|sextet|big band|orchestra)\s*$", "", s)
    s = s.strip()
    return s


def _normalize_key(title, artist):
    return f"{_normalize(title)}|{_normalize(artist)}"


def build_playlists(predictions):
    """Match playlist tracks against predictions and compute aggregate stats."""
    lookup = {}
    for p in predictions:
        key = _normalize_key(p['title'], p['artist'])
        lookup[key] = p

    results = []
    for playlist in PLAYLISTS:
        matched_tracks = []
        all_tracks = []

        for track_str in playlist["tracks"]:
            title, artist = track_str.split("|", 1)
            key = _normalize_key(title.strip(), artist.strip())
            pred = lookup.get(key)

            track_entry = {
                "title": title.strip(),
                "artist": artist.strip(),
                "matched": pred is not None,
            }
            if pred:
                track_entry["actual"] = pred["actual"]
                track_entry["predicted"] = pred["predicted"]
                track_entry["moods"] = pred.get("moods", [])
                track_entry["era"] = pred.get("era", "Unknown")
                track_entry["energy"] = pred.get("energy", 5)
                track_entry["replayability"] = pred.get("replayability")
                matched_tracks.append(pred)

            all_tracks.append(track_entry)

        # Aggregate stats for matched tracks
        if matched_tracks:
            avg_actual = round(sum(t["actual"] for t in matched_tracks) / len(matched_tracks), 2)
            avg_predicted = round(sum(t["predicted"] for t in matched_tracks) / len(matched_tracks), 2)
            avg_energy = round(sum(t.get("energy", 5) for t in matched_tracks) / len(matched_tracks), 1)
            replay_vals = [t["replayability"] for t in matched_tracks if t.get("replayability") is not None]
            avg_replayability = round(sum(replay_vals) / len(replay_vals), 2) if replay_vals else None

            # Top moods across all matched tracks
            mood_counts = {}
            for t in matched_tracks:
                for m in t.get("moods", []):
                    mood_counts[m] = mood_counts.get(m, 0) + 1
            top_moods = sorted(mood_counts.items(), key=lambda x: -x[1])[:5]
            top_moods = [m[0] for m in top_moods]

            # Top eras
            era_counts = {}
            for t in matched_tracks:
                era = t.get("era", "Unknown")
                era_counts[era] = era_counts.get(era, 0) + 1
            top_eras = sorted(era_counts.items(), key=lambda x: -x[1])[:3]
            top_eras = [e[0] for e in top_eras]
        else:
            avg_actual = None
            avg_predicted = None
            avg_energy = None
            avg_replayability = None
            top_moods = []
            top_eras = []

        results.append({
            "name": playlist["name"],
            "id": playlist["id"],
            "track_count": len(playlist["tracks"]),
            "matched_count": len(matched_tracks),
            "avg_actual": avg_actual,
            "avg_predicted": avg_predicted,
            "avg_energy": avg_energy,
            "avg_replayability": avg_replayability,
            "top_moods": top_moods,
            "top_eras": top_eras,
            "tracks": all_tracks,
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Train jazz taste model")
    parser.add_argument("--major", action="store_true",
                        help="Major version bump (new training data era)")
    parser.add_argument("--name", type=str, default="",
                        help="Codename for this version (e.g. Charmander)")
    parser.add_argument("--notes", type=str, default="",
                        help="Version notes (why this release)")
    parser.add_argument("--changelog", type=str, nargs="*", default=None,
                        help="List of changes for this version")
    args = parser.parse_args()

    print("Loading data...")
    tracks, albums = load_data()
    print(f"Loaded {len(tracks)} tracks, {len(albums)} albums")

    print("Engineering features...")
    X, y, feature_names, common_moods, common_subgenres, common_labels = engineer_features(tracks)
    print(f"Feature matrix: {X.shape[0]} samples x {X.shape[1]} features")
    print(f"Common moods ({len(common_moods)}): {common_moods}")
    print(f"Common subgenres ({len(common_subgenres)}): {common_subgenres}")
    print(f"Common labels ({len(common_labels)}): {common_labels}")

    print("\nTraining models...")
    model_results = train_models(X, y)
    print(f"Ridge — R²: {model_results['ridge']['r_squared']}, RMSE: {model_results['ridge']['rmse']}")
    print(f"Random Forest — R²: {model_results['random_forest']['r_squared']}, RMSE: {model_results['random_forest']['rmse']}")
    print(f"Best model: {model_results['best_model']}")

    print("\nComputing feature importance...")
    importance = get_feature_importance(model_results, feature_names)
    for f in importance[:5]:
        print(f"  {f['feature']}: {f['importance']} ({f['direction']})")

    print("\nComputing correlations...")
    correlations = compute_correlations(X, y, feature_names)

    print("\nClustering...")
    cluster_results, best_labels, coords = cluster_analysis(
        model_results["X_scaled"], tracks, feature_names
    )
    print(f"Best k: {cluster_results['best_k']}")
    for p in cluster_results["cluster_profiles"]:
        print(f"  Cluster {p['id']}: {p['size']} tracks, mean rating {p['mean_rating']}, top moods: {p['top_moods'][:3]}")

    print("\nBuilding output...")
    predictions = build_predictions(tracks, model_results, best_labels, coords)
    distributions = build_distributions(tracks, best_labels)
    rating_changes = extract_rating_changes(tracks, albums)

    history = load_history()
    best = model_results["best_model"]
    best_metrics = model_results[best] if best == "ridge" else model_results["random_forest"]
    history.append({
        "run_date": datetime.now().strftime("%Y-%m-%d"),
        "dataset_size": len(tracks),
        "best_model": best,
        "r_squared": best_metrics["r_squared"],
        "rmse": best_metrics["rmse"],
        "mae": best_metrics["mae"],
        "best_k": cluster_results["best_k"],
        "silhouette_score": max(cluster_results["silhouette_scores"]) if cluster_results["silhouette_scores"] else 0,
    })

    manifest = load_versions()
    new_version = next_version(manifest, is_major=args.major)

    output = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "version": new_version,
            "is_major": args.major,
            "total_tracks": len(tracks),
            "total_albums": len(albums),
            "mood_threshold": MOOD_THRESHOLD,
            "subgenre_threshold": SUBGENRE_THRESHOLD,
            "best_model": best,
            "feature_count": X.shape[1],
        },
        "models": {
            "ridge": model_results["ridge"],
            "random_forest": model_results["random_forest"],
        },
        "predictions": predictions,
        "feature_importance": importance,
        "correlations": correlations,
        "clusters": cluster_results,
        "distributions": distributions,
        "rating_changes": rating_changes,
        "history": history,
        "mood_axes": MOOD_AXES,
        "playlists": build_playlists(predictions),
        "albums": [{
            "title": a.get("title"),
            "artist": a.get("artist"),
            "year": a.get("year"),
            "label": a.get("label"),
            "era": a.get("era"),
            "rating": a.get("rating"),
            "liked": a.get("liked"),
            "replayability": a.get("replayability"),
            "moods": a.get("moods", []),
            "subgenres": a.get("subgenres", []),
            "notes": a.get("notes"),
            "notable_qualities": a.get("notable_qualities", []),
            "favorite_moments": a.get("favorite_moments"),
        } for a in albums],
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"\nExported to {OUTPUT_PATH}")
    print(f"History entries: {len(history)}")

    ridge = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0])
    scaler = model_results["scaler"]
    ridge.fit(scaler.transform(X), y)

    eras = sorted(set(t.get("era", "Unknown") for t in tracks))
    joblib.dump({
        "model": ridge,
        "scaler": scaler,
        "feature_names": feature_names,
        "common_moods": common_moods,
        "common_subgenres": common_subgenres,
        "common_labels": common_labels,
        "eras": eras,
    }, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    metrics_summary = {
        "dataset_size": len(tracks),
        "best_model": best,
        "r_squared": best_metrics["r_squared"],
        "rmse": best_metrics["rmse"],
        "mae": best_metrics["mae"],
        "feature_count": X.shape[1],
        "best_k": cluster_results["best_k"],
    }
    save_version_artifacts(new_version, manifest, metrics_summary,
                           is_major=args.major, name=args.name, notes=args.notes,
                           changelog=args.changelog)
    label = f"{new_version} ({args.name})" if args.name else new_version
    print(f"\nVersion {label} saved")
    if args.major:
        print(f"  Major release — snapshot saved to versions/v{new_version}/")


if __name__ == "__main__":
    main()
