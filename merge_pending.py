#!/usr/bin/env python3
"""Fold pending reviews (from the Review page) into the live dataset and clear the queue.

The Review page writes submissions to the `pending_reviews` table. Before cutting a
new model release, run this to promote them into `tracks`, then retrain:

    export DATABASE_URL=$(cat ~/.jazz_db_url)
    python3 merge_pending.py
    python3 pull_dataset.py
    python3 train.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import db  # noqa: E402


def merge_one(review):
    """Promote a pending review without throwing away enriched metadata."""
    af = review.get("audioFeatures") or {}
    audio_features = None
    if isinstance(af, dict) and af:
        audio_features = {
            "acousticness": af.get("acousticness"),
            "danceability": af.get("danceability"),
            "spotify_energy": af.get("spotify_energy"),
            "instrumentalness": af.get("instrumentalness"),
            "liveness": af.get("liveness"),
            "loudness": af.get("loudness"),
            "speechiness": af.get("speechiness"),
            "spotify_valence": af.get("spotify_valence"),
        }

    ui_only = {"id", "timestamp", "skipAt", "skipTotal", "favMoments", "audioFeatures"}
    track = {k: v for k, v in review.items() if k not in ui_only}
    track.update({
        "title": (review.get("title") or "").strip(),
        "artist": (review.get("artist") or "").strip(),
        "rating": review.get("rating"),
        "replayability": review.get("replayability"),
        "spotify_id": review.get("spotify_id") or review.get("spotifyId"),
        "album": review.get("album"),
        "year": review.get("year"),
        "entity_type": "track",
        "discovered_from": review.get("discovered_from") or "review-page",
        "notes": review.get("notes") or None,
        "favorite_moments": review.get("favMoments") or None,
        "liked": review.get("liked"),
    })
    if audio_features:
        track["audio_features"] = audio_features
    ts = review.get("timestamp") or ""
    if not track.get("date_added") and len(ts) >= 10:
        track["date_added"] = ts[:10]
    if not track.get("era") or not track.get("primary_instrument"):
        track["needs_enrichment"] = True
    return track


def main():
    pending = db.get_pending_reviews()
    if not pending:
        print("No pending reviews.")
        return 0

    print(f"Merging {len(pending)} pending review(s) into tracks...")
    for r in pending:
        track = merge_one(r)
        db.upsert_track(track)
        print(f"  + {track['title']} — {track['artist']} ({track.get('rating')}/10)")

    cleared = db.clear_pending_reviews()
    print(f"Cleared {cleared} pending review(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
