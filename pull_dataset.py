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
    tracks = db.fetch_tracks()
    OUT.write_text(json.dumps(tracks, ensure_ascii=False, indent=2), encoding="utf-8")
    rated = [t for t in tracks if t.get("rating") is not None and t.get("entity_type") != "album"]
    print(f"wrote {len(tracks)} tracks to {OUT} ({len(rated)} rated non-album)")


if __name__ == "__main__":
    main()
