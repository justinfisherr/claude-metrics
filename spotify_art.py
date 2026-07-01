#!/usr/bin/env python3
"""Fetch Spotify cover/artist art and backfill jazz-facts.json.

Uses the Client Credentials flow (no user login) against the public catalog, so
it only needs a client id + secret. Credentials are read from the Spotify MCP
server's config (~/spotify-mcp-server/spotify-config.json) or from the
SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET env vars.

Usage:
    python3 spotify_art.py backfill          # fill "image" on every fact missing one
    python3 spotify_art.py backfill --force  # refetch art for every fact
    python3 spotify_art.py artist "Bill Evans"        # print one artist image url
    python3 spotify_art.py album "Red Clay" "Freddie Hubbard"  # print album art url

Facts get art two ways:
  - song facts (have a spotify_id) -> that track's album cover
  - general facts                  -> the image of the artist the fact is about,
                                      detected from names in training-data.json
"""
import base64
import json
import os
import sys
import time
import urllib.parse
import urllib.request

CONFIG_PATH = os.path.expanduser("~/spotify-mcp-server/spotify-config.json")
FACTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jazz-facts.json")
TRAINING_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "training-data.json")
API = "https://api.spotify.com/v1"


def _creds():
    cid = os.environ.get("SPOTIFY_CLIENT_ID")
    secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    if cid and secret:
        return cid, secret
    with open(CONFIG_PATH) as fh:
        cfg = json.load(fh)
    return cfg["clientId"], cfg["clientSecret"]


def get_token():
    cid, secret = _creds()
    auth = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=b"grant_type=client_credentials",
        headers={"Authorization": f"Basic {auth}",
                 "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["access_token"]


def _api(token, path, params=None):
    url = f"{API}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:  # rate limited
                time.sleep(int(e.headers.get("Retry-After", "2")) + 1)
                continue
            raise
    return {}


def _pick(images, target=300):
    """Choose the image nearest `target` px wide; fall back to the largest."""
    if not images:
        return None
    sized = [im for im in images if im.get("width")]
    if sized:
        return min(sized, key=lambda im: abs(im["width"] - target))["url"]
    return images[0]["url"]


def track_album_art(token, spotify_id, target=300):
    data = _api(token, f"tracks/{spotify_id}")
    return _pick(data.get("album", {}).get("images", []), target)


def album_art(token, title, artist, target=300):
    q = f'album:"{title}" artist:"{artist}"'
    res = _api(token, "search", {"q": q, "type": "album", "limit": 5})
    items = res.get("albums", {}).get("items", [])
    for it in items:
        names = " ".join(a["name"].lower() for a in it.get("artists", []))
        if artist.lower().split()[-1] in names:
            return _pick(it.get("images", []), target)
    return _pick(items[0].get("images", []), target) if items else None


def artist_image(token, name, target=300):
    res = _api(token, "search", {"q": f'artist:"{name}"', "type": "artist", "limit": 5})
    items = res.get("artists", {}).get("items", [])
    exact = [it for it in items if it["name"].lower() == name.lower()]
    pool = exact or items
    pool.sort(key=lambda it: it.get("popularity", 0), reverse=True)
    return _pick(pool[0].get("images", []), target) if pool else None


def _split_names(raw):
    """Break a composite credit ('Monk & Coltrane', 'A, B') into single artists."""
    parts = [raw]
    for sep in ("&", ",", "/", " feat.", " featuring", " with ", " and "):
        parts = [p for chunk in parts for p in chunk.split(sep)]
    return [p.strip() for p in parts if len(p.strip()) > 3]


def known_artists():
    """All individual artist + personnel names from the dataset, longest first."""
    names = set()
    try:
        tracks = json.load(open(TRAINING_PATH))
    except FileNotFoundError:
        return []
    for t in tracks:
        if not isinstance(t, dict):
            continue
        if t.get("artist"):
            names.update(_split_names(t["artist"]))
        for kp in t.get("key_players", []) or []:
            names.update(_split_names(kp.split(" - ")[0]))
    return sorted(names, key=len, reverse=True)


def detect_artist(fact, names):
    """Return the artist a general fact is about, preferring the title."""
    title = fact.get("title", "")
    body = f"{title} {fact.get('fact', '')}"
    # Prefer a name that appears in the title.
    for n in names:
        if n.lower() in title.lower():
            return n
    for n in names:
        if n.lower() in body.lower():
            return n
    # Last-name-only fallback (e.g. "Coltrane", "Monk").
    for n in names:
        last = n.split()[-1]
        if len(last) > 4 and last.lower() in body.lower():
            return n
    return None


def backfill(force=False):
    token = get_token()
    names = known_artists()
    doc = json.load(open(FACTS_PATH))
    filled, skipped, missing = 0, 0, []
    for f in doc["facts"]:
        if f.get("image") and not force:
            skipped += 1
            continue
        url = None
        if f.get("spotify_id"):
            url = track_album_art(token, f["spotify_id"])
        else:
            # Prefer fresh detection so a corrected detector heals stale values.
            artist = detect_artist(f, names) or f.get("artist")
            if artist:
                f["artist"] = artist
                url = artist_image(token, artist)
        if url:
            f["image"] = url
            filled += 1
        else:
            f.setdefault("image", None)
            missing.append(f"{f['id']}: {f['title']}")
    json.dump(doc, open(FACTS_PATH, "w"), indent=2)
    open(FACTS_PATH, "a").write("\n")
    print(f"filled {filled}, already had {skipped}, no art for {len(missing)}")
    for m in missing:
        print("  no art ->", m)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1]
    if cmd == "backfill":
        backfill(force="--force" in sys.argv)
    elif cmd == "artist":
        print(artist_image(get_token(), sys.argv[2]) or "")
    elif cmd == "album":
        print(album_art(get_token(), sys.argv[2], sys.argv[3]) or "")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
