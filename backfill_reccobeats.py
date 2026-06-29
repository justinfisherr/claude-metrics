"""
Backfills ReccoBeats audio features into training-data.json.
Adds: acousticness, danceability, spotify_energy, instrumentalness,
      liveness, loudness, speechiness, spotify_valence.

Usage:
  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy python3 backfill_reccobeats.py
"""
import base64
import json
import os
import time
from pathlib import Path
import requests

TRAINING_DATA_PATH = Path(__file__).parent / "training-data.json"
RECCOBEATS_URL = "https://api.reccobeats.com/v1/audio-features"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search"
BATCH_SIZE = 40


def get_spotify_token():
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise SystemExit("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars")
    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(SPOTIFY_TOKEN_URL,
                         headers={"Authorization": f"Basic {creds}"},
                         data={"grant_type": "client_credentials"})
    resp.raise_for_status()
    return resp.json()["access_token"]


def search_spotify(token, title, artist, retries=3):
    query = f"track:{title} artist:{artist}"
    for attempt in range(retries):
        resp = requests.get(SPOTIFY_SEARCH_URL,
                            headers={"Authorization": f"Bearer {token}"},
                            params={"q": query, "type": "track", "limit": 1})
        if resp.status_code == 429:
            time.sleep(int(resp.headers.get("Retry-After", 2)))
            continue
        resp.raise_for_status()
        items = resp.json().get("tracks", {}).get("items", [])
        return items[0]["id"] if items else None
    return None


def fetch_reccobeats_batch(spotify_ids):
    resp = requests.get(RECCOBEATS_URL, params={"ids": ",".join(spotify_ids)})
    if resp.status_code != 200:
        print(f"  ReccoBeats error {resp.status_code}: {resp.text[:200]}")
        return {}
    result = {}
    for item in resp.json().get("content", []):
        href = item.get("href", "")
        sid = href.rstrip("/").split("/")[-1] if href else None
        if sid:
            result[sid] = {
                "acousticness":     item.get("acousticness"),
                "danceability":     item.get("danceability"),
                "spotify_energy":   item.get("energy"),
                "instrumentalness": item.get("instrumentalness"),
                "liveness":         item.get("liveness"),
                "loudness":         item.get("loudness"),
                "speechiness":      item.get("speechiness"),
                "spotify_valence":  item.get("valence"),
            }
    return result


def main():
    entries = json.loads(TRAINING_DATA_PATH.read_text())
    tracks = [(i, t) for i, t in enumerate(entries) if t.get("entity_type") != "album"]

    print(f"Loaded {len(tracks)} tracks from {TRAINING_DATA_PATH.name}")
    print("Getting Spotify token...")
    token = get_spotify_token()

    # Step 1: Search Spotify for each track
    print(f"\nSearching Spotify for {len(tracks)} tracks...")
    idx_to_sid = {}
    for n, (i, t) in enumerate(tracks, 1):
        title = t.get("title", "")
        artist = t.get("artist", "")
        sid = t.get("spotify_id") or search_spotify(token, title, artist)
        status = "hit" if sid else "miss"
        print(f"  [{n:3}/{len(tracks)}] {status}  {title} — {artist}")
        if sid:
            idx_to_sid[i] = sid
        time.sleep(0.1)

    sid_to_idx = {v: k for k, v in idx_to_sid.items()}
    print(f"\nFound {len(idx_to_sid)}/{len(tracks)} Spotify IDs")

    # Step 2: Batch fetch ReccoBeats features
    print("\nFetching ReccoBeats audio features...")
    all_features = {}
    sid_list = list(idx_to_sid.values())
    for i in range(0, len(sid_list), BATCH_SIZE):
        batch = sid_list[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1} ({len(batch)} tracks)...")
        all_features.update(fetch_reccobeats_batch(batch))
        time.sleep(0.5)

    print(f"Got ReccoBeats features for {len(all_features)} tracks")

    # Step 3: Merge into training data
    updated = 0
    for sid, features in all_features.items():
        idx = sid_to_idx.get(sid)
        if idx is None:
            continue
        t = entries[idx]
        if not t.get("audio_features"):
            t["audio_features"] = {"source": "reccobeats"}
        t["audio_features"].update(features)
        t["spotify_id"] = sid
        updated += 1

    TRAINING_DATA_PATH.write_text(json.dumps(entries, indent=2, ensure_ascii=False))
    print(f"\nUpdated {updated} tracks — saved to {TRAINING_DATA_PATH}")

    missing = [f"{t['title']} — {t['artist']}"
               for i, t in tracks if i not in idx_to_sid]
    if missing:
        print(f"\nNo Spotify ID found for {len(missing)} tracks:")
        for m in missing:
            print(f"  - {m}")


if __name__ == "__main__":
    main()
