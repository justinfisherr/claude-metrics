"""
Personnel metadata quality audit.
Prints tracks grouped by deficiency, sorted by rating (highest first).
"""
import json
from pathlib import Path

with open(Path(__file__).parent / "training-data.json") as f:
    data = json.load(f)

tracks = [t for t in data if t.get("entity_type") != "album"]

def has_role(players, keywords):
    return any(any(kw in p.lower() for kw in keywords) for p in players)

def player_count(t):
    return len(t.get("key_players") or [])

# Classify each track
no_personnel   = [t for t in tracks if not t.get("key_players")]
missing_both   = [t for t in tracks if t.get("key_players")
                  and not has_role(t["key_players"], ["bass"])
                  and not has_role(t["key_players"], ["drum", "percuss"])]
missing_bass   = [t for t in tracks if t.get("key_players")
                  and not has_role(t["key_players"], ["bass"])
                  and has_role(t["key_players"], ["drum", "percuss"])]
missing_drums  = [t for t in tracks if t.get("key_players")
                  and has_role(t["key_players"], ["bass"])
                  and not has_role(t["key_players"], ["drum", "percuss"])]
thin           = [t for t in tracks if t.get("key_players")
                  and player_count(t) < 4
                  and has_role(t["key_players"], ["bass"])
                  and has_role(t["key_players"], ["drum", "percuss"])]


def show(group, label):
    if not group:
        return
    group = sorted(group, key=lambda t: -t["rating"])
    print(f"\n{'='*70}")
    print(f"{label}  ({len(group)} tracks)")
    print(f"{'='*70}")
    print(f"{'Rating':>6}  {'Players':>3}  {'Title':<38}  {'Artist'}")
    print("-" * 70)
    for t in group:
        kp = t.get("key_players") or []
        names = ", ".join(p.split(" - ")[0] for p in kp) if kp else "—"
        title = t["title"][:37]
        print(f"  {t['rating']:>4}   {len(kp):>2}   {title:<38}  {t['artist']}")
        if kp:
            print(f"         players: {names}")
        print()

show(no_personnel,  "GROUP 1 — NO personnel at all")
show(missing_both,  "GROUP 2 — Has some players but missing BOTH bass AND drums")
show(missing_bass,  "GROUP 3 — Missing bassist (has drummer)")
show(missing_drums, "GROUP 4 — Missing drummer (has bassist)")
show(thin,          "GROUP 5 — Has bass + drums but fewer than 4 total players")

total_deficient = len(set(
    t["title"] for group in [no_personnel, missing_both, missing_bass, missing_drums, thin]
    for t in group
))
print(f"\n{'='*70}")
print(f"SUMMARY")
print(f"{'='*70}")
print(f"Total tracks:              {len(tracks)}")
print(f"No personnel at all:       {len(no_personnel)}")
print(f"Missing both bass+drums:   {len(missing_both)}")
print(f"Missing bassist only:      {len(missing_bass)}")
print(f"Missing drummer only:      {len(missing_drums)}")
print(f"Thin (< 4, has both):      {len(thin)}")
print(f"Total with any deficiency: {total_deficient}  ({100*total_deficient//len(tracks)}%)")
