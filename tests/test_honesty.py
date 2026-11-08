"""Honesty tests for the taste model.

These guard the two properties that were broken:
  1. A row's features must not depend on its own rating or its album siblings.
  2. A track's score must not depend on whether it already exists in the dataset.

Run with:  python3 -m pytest tests -q
"""

import numpy as np
import pytest

import predict
import train


@pytest.fixture(scope="module")
def tracks():
    data, _ = train.load_data()
    return [t for t in data if t.get("rating") is not None]


@pytest.fixture(scope="module")
def base(tracks):
    X, y, names, _, _ = train.engineer_features(tracks)
    return X, y, names


def _row(X, names, index):
    return X.iloc[index]


def test_no_order_or_recency_features(base):
    _, _, names = base
    banned = {
        "rating_order_percentile",
        "recency_weight",
        "is_recent",
        "ewma_taste_level",
        "artist_recent_period_delta",
        "has_elite_collaborator",
        "leader_was_elite_sideman",
    }
    assert not (banned & set(names)), f"data-collection artefacts still in the model: {banned & set(names)}"


def test_model_does_not_train_on_rating_means():
    """Rating-derived columns are computed for the viz but must not be model inputs."""
    model = predict.load_model()
    leaked = train.TARGET_ENCODING_KEYS & set(model["feature_names"])
    assert not leaked, f"rating encodings leaked into the deployed model: {leaked}"
    flags = train.DATA_QUALITY_KEYS & set(model["feature_names"])
    assert not flags, f"diagnostic flags leaked into the deployed model: {flags}"


def test_masking_own_rating_preserves_features(tracks, base):
    X, _, names = base
    index = next(
        i for i, t in enumerate(tracks)
        if t.get("artist") and sum(1 for z in tracks if z.get("artist") == t["artist"]) > 1
    )
    masked = [dict(t) for t in tracks]
    masked[index]["rating"] = None
    X2, _, _, _, _ = train.engineer_features(masked)
    delta = (X2.iloc[index] - X.iloc[index]).abs().max()
    assert delta < 0.02, f"own rating still changes the row's features (max delta {delta:.3f})"


def test_masking_a_sibling_preserves_features(tracks, base):
    X, _, names = base
    groups = train.album_groups(tracks)
    counts = {}
    for g in groups:
        counts[g] = counts.get(g, 0) + 1
    index = next(i for i, g in enumerate(groups) if counts[g] >= 3 and tracks[i].get("rating") is not None)
    sibling = next(
        j for j, g in enumerate(groups)
        if g == groups[index] and j != index and tracks[j].get("rating") is not None
    )
    masked = [dict(t) for t in tracks]
    masked[sibling]["rating"] = None
    X2, _, _, _, _ = train.engineer_features(masked)
    target_cols = [c for c in names if c not in {"year", "energy", "tempo", "harmonic_complexity"}]
    delta = (X2.iloc[index][target_cols] - X.iloc[index][target_cols]).abs().max()
    assert delta < 0.06, f"album sibling still changes the row's features (max delta {delta:.3f})"


def test_missing_instrumentation_is_not_pianoless(tracks, base):
    X, _, _ = base
    empty = [i for i, t in enumerate(tracks) if not t.get("instrumentation")]
    assert empty, "expected some tracks without instrumentation"
    assert (X.iloc[empty]["is_pianoless"] == 0).all(), "unknown instrumentation still claims pianoless"


def test_in_place_and_new_candidate_score_the_same(tracks):
    model = predict.load_model()
    model_est, scaler, names = model["model"], model["scaler"], model["feature_names"]
    index = next(i for i, t in enumerate(tracks) if t.get("rating") is not None)

    in_place = np.array(predict.predict_tracks([tracks[index]]))
    masked = [dict(t) for t in tracks]
    masked[index]["rating"] = None
    X, _, _, _, _ = train.engineer_features(masked)
    X = X.reindex(columns=names, fill_value=0)
    as_new = np.clip(model_est.predict(scaler.transform(X.iloc[[index]])), 1, 10)

    assert abs(in_place[0] - as_new[0]) < 0.1, (
        f"score depends on dataset position: in-place {in_place[0]:.2f} vs new {as_new[0]:.2f}"
    )


def test_unrated_candidate_scores_without_crashing():
    candidate = {
        "title": "Test Track That Does Not Exist",
        "artist": "Test Artist",
        "era": "HARD BOP",
        "primary_instrument": "tenor sax",
        "tempo": "medium fast",
        "harmonic_complexity": "High",
        "subgenres": ["Hard Bop"],
        "moods": ["bluesy"],
        "key_players": ["Test Artist - tenor saxophone", "Other Player - piano"],
    }
    score = predict.predict_tracks([candidate])[0]
    assert 1 <= score <= 10


def test_candidate_tags_are_normalised():
    model = predict.load_model()
    normalised = predict.normalize_candidate(
        {
            "era": "hard bop",
            "primary_instrument": "tenor sax",
            "tempo": "medium fast",
            "harmonic_complexity": "HIGH",
            "subgenres": ["HARD BOP"],
            "key_players": ["A - piano", "B - bass"],
        },
        model,
    )
    assert normalised["era"] == "Hard Bop"
    assert normalised["primary_instrument"] == "tenor saxophone"
    assert normalised["tempo"] == "medium-fast"
    assert normalised["harmonic_complexity"] == "high"
    assert normalised["subgenres"] == ["hard bop"]
    assert normalised["instrumentation"] == ["bass", "piano"]


def test_scoring_is_not_collapsed_to_the_mean(tracks):
    """The old live path squeezed every candidate into 4.3-6.0. Different tags
    must still produce meaningfully different scores."""
    model = predict.load_model()
    samples = tracks[:12]
    candidates = []
    for i, t in enumerate(samples):
        candidates.append({
            "title": f"Spread Test {i}",
            "artist": t["artist"],
            "year": t.get("year"),
            "era": t.get("era"),
            "primary_instrument": t.get("primary_instrument"),
            "tempo": t.get("tempo") or "medium",
            "harmonic_complexity": t.get("harmonic_complexity") or "medium",
            "subgenres": t.get("subgenres") or [],
            "moods": t.get("moods") or [],
            "key_players": t.get("key_players") or [],
            "instrumentation": t.get("instrumentation") or [],
        })
    scores = np.array(predict.predict_tracks(candidates))
    assert scores.std() > 0.25, f"scores collapsed to a flat band (sd {scores.std():.3f})"
