# Command: Song Facts

Pull the latest repo, generate facts for recently-added songs that aren't on the
Facts page yet, attach album/artist art from Spotify, then build and push.

The output feeds the **/facts** route (`src/pages/Facts.jsx`) which reads
`jazz-facts.json` at the repo root.

## Steps

### 1. Sync
```bash
cd ~/claude-metrics && git pull --rebase
```

### 2. Find songs missing a fact
- Read `training-data.json` (list of track objects) and `jazz-facts.json` (`{ "facts": [...] }`).
- Build a set of songs that already have a fact: for each fact with a `spotify_id`
  use that; otherwise use `"{song}|{artist}"` lowercased.
- Sort `training-data.json` by `date_added` (descending). Take the newest tracks
  whose song is **not** already in the fact set.
- Default to the **5 newest** un-facted tracks unless the user names a number or
  specific songs. If nothing is new, say so and stop — do not invent facts.

### 3. Write one fact per song
For each selected track, write a single accurate fact drawn from its own data —
`notes`, `favorite_moments`, `notable_qualities`, `key_players`, `subgenres`,
`era`, `label`, `year`. Match the voice of the existing facts: one tight
paragraph, specific, no filler. **Do not fabricate** history you can't source
from the track entry or well-known fact.

### 4. Get the image (Spotify MCP)
For each track, fetch cover/artist art via the Spotify MCP:
- Prefer the album: `getAlbums` with the track's `spotify_id`'s album, or
  `searchSpotify` for `"{title} {artist}"` and read the track → album → `images`.
- Use the largest `images[].url` (or a ~300px one). Fall back to the artist image
  via `getTopArtists`/search if no album art. If nothing resolves, set `image: null`
  and note it.

### 5. Append to `jazz-facts.json`
Give each new fact the next sequential `id` (max existing id + 1) and these fields:
```json
{
  "id": 41,
  "title": "Short hook title",
  "fact": "One-paragraph fact grounded in the track's data.",
  "song": "Track Title",
  "artist": "Artist Name",
  "spotify_id": "…",
  "image": "https://i.scdn.co/image/…"
}
```
Keep the original general facts untouched (they have no `song`/`image` and stay
as-is — the page renders both).

### 6. Build, commit, push
```bash
cd ~/claude-metrics && npm run build \
  && git add -A \
  && git commit -m "Add N song facts to Facts page" \
  && git push origin main
```
`npm run build` copies `jazz-facts.json` into `docs/`, so the live GitHub Pages
site updates. Report which songs were added and any that couldn't get art.
