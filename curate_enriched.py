#!/usr/bin/env python3
"""Apply curated album metadata to the app-logged rows that lacked it."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import db  # noqa: E402
import curated_metadata  # noqa: E402


def main():
    rows = db.fetch_tracks_with_meta()
    changed = 0
    for row in rows:
        track = row["data"]
        if track.get("entity_type") == "album" or not track.get("metadata_sources"):
            continue
        updated = curated_metadata.apply(track)
        if updated != track:
            db.upsert_track(updated)
            changed += 1
            print(f"  + {updated.get('title')} — {updated.get('artist')}: {updated.get('era')} / {updated.get('label')} / {len(updated.get('key_players') or [])} players")
    print(f"Curated {changed} track(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
