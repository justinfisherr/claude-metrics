#!/usr/bin/env python3
"""Pull the live dataset from Postgres and write it to training-data.json.

Run this before `train.py` so the model is trained on the latest ratings added
from the website:

    DATABASE_URL=$(cat ~/.jazz_db_url) python3 pull_dataset.py
    python3 train.py
"""

import json
from pathlib import Path

import db

OUT = Path(__file__).parent / "training-data.json"


def main():
    rows = db.fetch_tracks_with_meta()
    tracks = []
    for row in rows:
        track = row["data"]
        if not track.get("date_added") and row.get("updated_at"):
            track["date_added"] = row["updated_at"].date().isoformat()
            track["date_added_source"] = "db_updated_at"
        tracks.append(track)
    OUT.write_text(json.dumps(tracks, ensure_ascii=False, indent=2), encoding="utf-8")
    rated = [t for t in tracks if t.get("rating") is not None and t.get("entity_type") != "album"]
    print(f"wrote {len(tracks)} tracks to {OUT} ({len(rated)} rated non-album)")


if __name__ == "__main__":
    main()
