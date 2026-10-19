#!/usr/bin/env python3
"""Backfill model-critical metadata on sparse tracks already in Postgres.

The website rating paths used to store only title/artist/rating. This walks
every track missing era or primary instrument, asks the scoring API to enrich
it from Spotify + the existing dataset, and writes the result back.

    export DATABASE_URL=$(cat ~/.jazz_db_url)
    python3 enrich_tracks.py
    python3 pull_dataset.py
"""

import json
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))

import db  # noqa: E402

API = os.environ.get("JAZZ_API", "https://jazz-score-api.vercel.app")
PASSWORD = os.environ.get("APP_PASSWORD", "4416")


def main():
    rows = db.fetch_tracks_with_meta()
    targets = [
        row for row in rows
        if row["data"].get("entity_type") != "album"
        and any(not row["data"].get(k) for k in ("era", "primary_instrument", "key_players", "label", "subgenres", "moods"))
    ]
    print(f"{len(targets)} track(s) need enrichment")
    if not targets:
        return 0

    headers = {"Content-Type": "application/json", "x-app-password": PASSWORD}
    ok = failed = 0
    for row in targets:
        track = dict(row["data"])
        if not track.get("date_added") and row.get("updated_at"):
            track["date_added"] = row["updated_at"].date().isoformat()
            track["date_added_source"] = "db_updated_at"
        track["apply"] = True
        try:
            res = requests.post(f"{API}/api/enrich", headers=headers, json=track, timeout=90)
            body = res.json()
            if not res.ok:
                raise RuntimeError(body.get("error") or f"HTTP {res.status}")
            out = body["track"]
            ok += 1
            print(f"  + {out.get('title')} — {out.get('artist')}: era={out.get('era')} instrument={out.get('primary_instrument')} players={len(out.get('key_players') or [])}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  ! {track.get('title')} — {track.get('artist')}: {exc}")
    print(f"Enriched {ok}, failed {failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
