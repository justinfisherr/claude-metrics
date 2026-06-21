import json
import re
import os
import joblib
from datetime import datetime
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
_TRAINING_DATA_CANDIDATES = [
    Path.home() / "Documents" / "remote" / "Music" / "Jazz Dataset" / "training-data.md",
    Path.home() / "Music" / "Jazz Dataset" / "training-data.md",
]
TRAINING_DATA_PATH = next((p for p in _TRAINING_DATA_CANDIDATES if p.exists()), _TRAINING_DATA_CANDIDATES[0])
OUTPUT_PATH = SCRIPT_DIR / "dashboard-data.json"
MODEL_PATH = SCRIPT_DIR / "model.joblib"

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
MOOD_THRESHOLD = 3
SUBGENRE_THRESHOLD = 3
LABEL_THRESHOLD = 3


def load_data():
    text = TRAINING_DATA_PATH.read_text()
    match = re.search(r"```json\s*\n(.+?)\n```", text, re.DOTALL)
    all_entries = json.loads(match.group(1))
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

    for idx, t in enumerate(tracks):
        row = {}
        row["energy"] = t.get("energy", 5)
        row["year"] = t.get("year") or 1960
        row["tempo"] = TEMPO_MAP.get(t.get("tempo", "medium"), 2.5)
        row["harmonic_complexity"] = COMPLEXITY_MAP.get(t.get("harmonic_complexity", "medium"), 2)
        row["replayability"] = t.get("replayability", 5)
        row["playthrough"] = t.get("playthrough", 0.75)

        track_era = t.get("era", "Unknown")
        for era in eras:
            row[f"era_{era}"] = 1 if track_era == era else 0

        instrument = t.get("primary_instrument", "other")
        group = INSTRUMENT_GROUPS.get(instrument, "other")
        for g in INST_GROUP_VALUES:
            row[f"inst_{g}"] = 1 if group == g else 0

        track_moods = t.get("moods", [])
        for m in common_moods:
            row[f"mood_{m}"] = 1 if m in track_moods else 0

        track_subgenres = t.get("subgenres", [])
        for s in common_subgenres:
            row[f"subgenre_{s}"] = 1 if s in track_subgenres else 0

        row["mood_count"] = len(track_moods)
        row["subgenre_count"] = len(track_subgenres)

        instr_lower = [i.lower() for i in t.get("instrumentation", [])]
        instr_joined = " ".join(instr_lower)
        row["ensemble_size"] = len(instr_lower)
        row["has_guitar"] = int("guitar" in instr_joined)
        row["has_strings"] = int("strings" in instr_joined or "orchestra" in instr_joined)
        row["has_vocals"] = int("vocal" in instr_joined)
        row["is_pianoless"] = int("piano" not in instr_joined)
        row["has_trombone"] = int("trombone" in instr_joined)

        track_label = t.get("label")
        for l in common_labels:
            row[f"label_{l}"] = 1 if track_label == l else 0

        row["key_player_count"] = len(t.get("key_players", []))

        source = t.get("discovered_from", "self")
        for s in DISCOVERY_SOURCES:
            row[f"source_{s}"] = 1 if source == s else 0

        row["has_favorite_moments"] = 1 if t.get("favorite_moments") else 0
        row["energy_tempo"] = row["energy"] * row["tempo"]

        artist = t.get("artist", "Unknown")
        artist_indices = artist_track_indices[artist]
        if len(artist_indices) > 1:
            other_ratings = [tracks[j]["rating"] for j in artist_indices if j != idx]
            row["artist_mean_rating"] = np.mean(other_ratings)
        else:
            row["artist_mean_rating"] = global_mean
        row["artist_track_count"] = len(artist_indices)

        if has_audio:
            audio = t.get("audio_features") or {}
            row["duration_s"] = audio.get("duration_s", 300)
            row["popularity"] = audio.get("popularity", 50)
            row["tempo_bpm"] = audio.get("tempo_bpm", 120)
            row["time_signature"] = audio.get("time_signature", 4)
            row["is_live"] = int(audio.get("is_live", False))

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
        "replayability": "Replayability",
        "has_favorite_moments": "Has Fav Moments",
        "duration_s": "Duration",
        "popularity": "Spotify Popularity",
        "tempo_bpm": "Tempo (BPM)",
        "time_signature": "Time Signature",
        "is_live": "Live Recording",
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


def main():
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

    output = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
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
        "history": history,
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


if __name__ == "__main__":
    main()
