#!/usr/bin/env python3
"""How are the recommendations actually landing?

Joins the `recommendations` log (written by POST /api/recommend) to the live
ratings and reports the things the old pipeline could not answer: did the model's
top picks get rated higher, and is the displayed score calibrated?

    DATABASE_URL=$(cat ~/.jazz_db_url) python3 reco_report.py
    DATABASE_URL=$(cat ~/.jazz_db_url) python3 reco_report.py --since 2026-10-21

Only recommendations that have since been rated count toward precision/calibration.
"""

import argparse
import collections
from datetime import date

import numpy as np

import db

BUCKETS = [(0, 5), (5, 6), (6, 7), (7, 8), (8, 10.1)]
GOOD = 7.0


def fetch_recommendations(since=None):
    with db.get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT created_at, kind, title, artist, spotify_id, score, model_type, source, prompt, tags
            FROM recommendations
            WHERE (%s IS NULL OR created_at >= %s)
            ORDER BY created_at
            """,
            (since, since),
        )
        return cur.fetchall()


def index_tracks():
    by_title = collections.defaultdict(list)
    by_spotify = {}
    for t in db.fetch_tracks():
        by_title[db._norm_title(t.get("title"))].append(t)
        if t.get("spotify_id"):
            by_spotify[t["spotify_id"]] = t
    return by_title, by_spotify


def match(rec, by_title, by_spotify):
    _, _, title, artist, spotify_id, *_ = rec
    if spotify_id and spotify_id in by_spotify:
        return by_spotify[spotify_id]
    tn = db._norm_title(title)
    an = db._norm(artist)
    for t in by_title.get(tn, []):
        ta = db._norm(t.get("artist") or "")
        if ta == an or (ta and an and (ta in an or an in ta)):
            return t
    return None


def spearman(a, b):
    from scipy.stats import spearmanr

    if len(a) < 3:
        return None
    return float(spearmanr(a, b).statistic)


def main():
    parser = argparse.ArgumentParser(description="Recommendation precision and calibration")
    parser.add_argument("--since", help="ISO date, e.g. 2026-10-21")
    args = parser.parse_args()
    since = date.fromisoformat(args.since) if args.since else None

    recs = fetch_recommendations(since)
    if not recs:
        print("No recommendations logged yet. They are recorded when /api/recommend serves them.")
        return

    by_title, by_spotify = index_tracks()
    rows = []
    for rec in recs:
        if rec[1] != "track":
            continue
        track = match(rec, by_title, by_spotify)
        rating = track.get("rating") if track else None
        rows.append({
            "when": rec[0],
            "score": rec[5],
            "model_type": rec[6],
            "source": rec[7],
            "rated": rating is not None,
            "rating": rating,
            "tags": rec[9],
        })

    tagged = [r for r in rows if r["source"] == "llm"]
    with_era = sum(1 for r in tagged if (r["tags"] or {}).get("era") not in (None, "", "Unknown"))
    with_inst = sum(1 for r in tagged if (r["tags"] or {}).get("primary_instrument") not in (None, "", "Unknown"))
    print(f"{len(recs)} logged, {len(rows)} track picks, "
          f"{sum(1 for r in rows if r['rated'])} since rated")
    if tagged:
        print(f"tag coverage on {len(tagged)} model picks: era {with_era / len(tagged):.0%}, "
              f"instrument {with_inst / len(tagged):.0%}")
    if recs:
        print(f"range: {recs[0][0]:%Y-%m-%d} → {recs[-1][0]:%Y-%m-%d}")

    rated = [r for r in rows if r["rated"]]
    if len(rated) < 3:
        print("\nNot enough rated picks yet. Review a few from the AI page, then rerun.")
        return

    scores = np.array([r["score"] for r in rated if r["score"] is not None], dtype=float)
    actual = np.array([r["rating"] for r in rated if r["score"] is not None], dtype=float)
    rs = spearman(scores, actual)
    print(f"\nscored picks rated: {len(scores)}")
    print(f"mean displayed score {scores.mean():.2f} · mean actual rating {actual.mean():.2f}")
    if rs is not None:
        print(f"Spearman(score, rating) {rs:+.3f}")
    print(f"baseline: share of all rated picks at {GOOD:g}+ = {(actual >= GOOD).mean():.0%}")

    order = np.argsort(-scores)
    half = max(1, len(order) // 2)
    top, bottom = actual[order[:half]], actual[order[half:]]
    print(f"top half by score: mean {top.mean():.2f}, {np.mean(top >= GOOD):.0%} good")
    print(f"bottom half:       mean {bottom.mean():.2f}, {np.mean(bottom >= GOOD):.0%} good")

    print("\ncalibration")
    for lo, hi in BUCKETS:
        mask = (scores >= lo) & (scores < hi)
        if mask.sum():
            print(f"  {lo:>2g}–{hi:<3g}  n={int(mask.sum()):<3d} mean actual {actual[mask].mean():.2f}")

    print("\nby source")
    for source, group in collections.Counter(r["source"] for r in rated).items():
        g = [r for r in rated if r["source"] == source]
        print(f"  {source:<9} n={len(g):<3d} mean actual {np.mean([r['rating'] for r in g]):.2f}")

    print("\nby model")
    for model, group in collections.Counter(r["model_type"] for r in rated).items():
        g = [r for r in rated if r["model_type"] == model]
        print(f"  {model or 'unknown':<18} n={len(g):<3d} mean actual {np.mean([r['rating'] for r in g]):.2f}")


if __name__ == "__main__":
    main()
