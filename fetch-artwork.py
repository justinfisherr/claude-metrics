#!/usr/bin/env python3
"""Fetch album artwork from iTunes Search API for all albums in training data."""
import json, urllib.request, urllib.parse, time

with open('training-data.json') as f:
    tracks = json.load(f)

albums = {}
for t in tracks:
    album = t.get('album')
    artist = t.get('artist')
    if album and album not in albums:
        albums[album] = artist

cache = {'albums': {}, 'artists': {}}

print(f"Fetching artwork for {len(albums)} albums...")
for album, artist in albums.items():
    query = f"{album} {artist}"
    params = urllib.parse.urlencode({'term': query, 'entity': 'album', 'limit': 1})
    url = f"https://itunes.apple.com/search?{params}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if data.get('resultCount', 0) > 0:
                art = data['results'][0].get('artworkUrl100', '')
                if art:
                    cache['albums'][album] = art.replace('100x100bb', '600x600bb')
                    print(f"  OK: {album}")
                else:
                    print(f"  NO ART: {album}")
            else:
                print(f"  NOT FOUND: {album}")
    except Exception as e:
        print(f"  ERROR: {album} -- {e}")
    time.sleep(0.3)

artists = set(t.get('artist') for t in tracks if t.get('artist'))
for artist in sorted(artists):
    artist_tracks = [t for t in tracks if t.get('artist') == artist]
    best_album = max(artist_tracks, key=lambda t: t.get('rating', 0)).get('album')
    if best_album and best_album in cache['albums']:
        cache['artists'][artist] = cache['albums'][best_album]

print(f"\nCached: {len(cache['albums'])} albums, {len(cache['artists'])} artists")
with open('artwork-cache.json', 'w') as f:
    json.dump(cache, f, indent=2)
print("Saved artwork-cache.json")
