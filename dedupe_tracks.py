#!/usr/bin/env python3
"""Merge tracks that point at the same Spotify recording.

Version suffixes ("- Mono", "- Remastered") often create two rows for the same
audio with contradictory ratings. Keep the most complete row, average the
ratings, preserve the individual scores, and delete the duplicates.
"""

import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import db  # noqa: E402


def completeness(t):
    return sum(1 for k in ("era", "primary_instrument", "label", "key_players", "subgenres", "moods", "album", "year") if t.get(k))


def main():
    tracks = [r["data"] for r in db.fetch_tracks_with_meta() if r["data"].get("entity_type") != "album"]
    groups = defaultdict(list)
    for t in tracks:
        if t.get("spotify_id"):
            groups[t["spotify_id"]].append(t)

    merged = 0
    for sid, group in groups.items():
        if len(group) < 2:
            continue
        group.sort(key=lambda t: (completeness(t), t.get("rating") is not None), reverse=True)
        keep = dict(group[0])
        ratings = [t.get("rating") for t in group if t.get("rating") is not None]
        variants = [{"title": t.get("title"), "rating": t.get("rating")} for t in group]
        if ratings:
            keep["rating"] = round(sum(ratings) / len(ratings), 2)
        keep["rating_variants"] = variants
        keep["merged_duplicates"] = [t.get("title") for t in group[1:]]
        notes = [t.get("notes") for t in group if t.get("notes")]
        if notes:
            keep["notes"] = " | ".join(dict.fromkeys(notes))
        db.upsert_track(keep)
        for t in group[1:]:
            db.delete_track(t.get("title"), t.get("artist"))
        merged += len(group) - 1
        print(f"  + merged {len(group)} rows for {keep.get('title')} — {keep.get('artist')}: ratings {ratings} -> {keep.get('rating')}")
    print(f"Merged {merged} duplicate row(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
