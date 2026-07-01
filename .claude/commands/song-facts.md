# Command: Song Facts

Pull the latest repo, generate facts for recently-added songs that aren't on the
Facts page yet, fetch cover/artist art from Spotify, then build and push.

The output feeds the **/facts** route (`src/pages/Facts.jsx`) which reads
`jazz-facts.json` at the repo root. Facts carry optional `song` / `artist` /
`spotify_id` / `image` fields; the page renders both song facts (album art) and
the older general facts (artist portraits).

**Art is handled entirely by `spotify_art.py` — do NOT use the Spotify MCP.**
The script uses the Spotify Web API (client-credentials flow, no user login) and
does its own searching, so the command needs no MCP calls at all.

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
  specific songs. If nothing is new, say so and skip to art backfill (step 4)
  in case older facts are still missing images — do not invent facts.

### 3. Write one fact per song and append to `jazz-facts.json`
For each selected track, write a single accurate fact drawn from its own data —
`notes`, `favorite_moments`, `notable_qualities`, `key_players`, `subgenres`,
`era`, `label`, `year`. Match the voice of the existing facts: one tight
paragraph, specific, no filler. **Do not fabricate** history you can't source
from the track entry or well-known fact.

Append each with the next sequential `id` (max existing id + 1). Leave `image`
off — step 4 fills it:
```json
{
  "id": 46,
  "title": "Short hook title",
  "fact": "One-paragraph fact grounded in the track's data.",
  "song": "Track Title",
  "artist": "Artist Name",
  "spotify_id": "…"
}
```

### 4. Fetch art (no MCP)
```bash
cd ~/claude-metrics && python3 spotify_art.py backfill
```
This fills `image` on every fact that's missing one:
- **song facts** (have `spotify_id`) → that track's album cover
- **general facts** → the portrait of the artist the fact is about, auto-detected
  from the artist/personnel names in `training-data.json`

Credentials are read from `~/spotify-mcp-server/spotify-config.json` (the same
app the MCP uses) or `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` env vars.
Pure concept facts with no single artist stay imageless — that's expected; the
script prints which ones got no art. Use `--force` to refetch every image.

### 5. Build, commit, push
```bash
cd ~/claude-metrics && npm run build \
  && git add -A \
  && git commit -m "Add N song facts to Facts page" \
  && git push origin main
```
`npm run build` copies `jazz-facts.json` into `docs/`, so the live GitHub Pages
site updates. Report which songs were added and any facts that couldn't get art.
