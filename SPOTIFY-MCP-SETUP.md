# Spotify MCP Server Setup

Step-by-step guide to set up the Spotify MCP server on any machine (VM, desktop, etc.) so Claude Code can control Spotify playback, search tracks, and manage playlists.

## Prerequisites

- Node.js v16+
- A Spotify Premium account
- A Spotify Developer app (see below)

## Step 1: Clone and Build

```bash
cd ~
git clone https://github.com/marcelmarais/spotify-mcp-server.git
cd spotify-mcp-server
npm install
npm run build
```

## Step 2: Create a Spotify Developer App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **Create an App**
4. Fill in:
   - App Name: `Jazz ML`
   - App Description: `MCP server for jazz recommendation system`
5. Accept Terms of Service, click **Create**
6. In the app dashboard, copy the **Client ID**
7. Click **Show Client Secret**, copy the **Client Secret**
8. Click **Edit Settings** → add Redirect URI: `http://127.0.0.1:8888/callback`
9. Save

## Step 3: Configure

```bash
cd ~/spotify-mcp-server
cp spotify-config.example.json spotify-config.json
```

Edit `spotify-config.json` with your credentials:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "redirectUri": "http://127.0.0.1:8888/callback"
}
```

## Step 4: Authenticate

```bash
npm run auth
```

This will:
1. Print an authorization URL — open it in a browser
2. Log in to Spotify and authorize the app
3. Spotify redirects with a code — the script exchanges it for tokens
4. Tokens are saved to `spotify-config.json` automatically

After auth, your config will look like:

```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "redirectUri": "http://127.0.0.1:8888/callback",
  "accessToken": "BQAi9Pn...kKQ",
  "refreshToken": "AQDQcj...7w",
  "expiresAt": 1677889354671
}
```

Tokens auto-refresh — you shouldn't need to re-auth unless something breaks.

**Note for VMs:** If your VM doesn't have a browser, run `npm run auth` on a machine that does, complete the OAuth flow, then copy the `spotify-config.json` with tokens to the VM.

## Step 5: Configure Claude Code

Add the MCP server to your Claude Code settings. Create or edit `.claude/settings.local.json` in your project directory:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/home/YOUR_USERNAME/spotify-mcp-server/build/index.js"]
    }
  }
}
```

Or add to your global settings at `~/.claude/settings.json`.

## Step 6: Add Permissions

Add these to the `permissions.allow` array in your settings to avoid permission prompts:

```json
{
  "permissions": {
    "allow": [
      "mcp__spotify__searchSpotify",
      "mcp__spotify__getNowPlaying",
      "mcp__spotify__playMusic",
      "mcp__spotify__pausePlayback",
      "mcp__spotify__resumePlayback",
      "mcp__spotify__skipToNext",
      "mcp__spotify__skipToPrevious",
      "mcp__spotify__getMyPlaylists",
      "mcp__spotify__getPlaylistTracks",
      "mcp__spotify__createPlaylist",
      "mcp__spotify__addTracksToPlaylist",
      "mcp__spotify__getUsersSavedTracks",
      "mcp__spotify__removeUsersSavedTracks",
      "mcp__spotify__addToQueue",
      "mcp__spotify__getQueue",
      "mcp__spotify__getRecentlyPlayed",
      "mcp__spotify__setVolume",
      "mcp__spotify__adjustVolume",
      "mcp__spotify__getTopTracks",
      "mcp__spotify__getTopArtists"
    ]
  }
}
```

## Step 7: Verify

Restart Claude Code, then test:

```
> search for Miles Davis on Spotify
```

If it returns results, you're good.

## Troubleshooting

- **403 errors**: Tokens expired and auto-refresh failed. Run `npm run auth` again.
- **No devices found**: Make sure Spotify is open and playing on some device. The MCP controls playback on active Spotify clients.
- **Command not found (node)**: Make sure Node.js is installed and `node` is in your PATH.
- **VM with no browser**: Complete OAuth on your local machine, then `scp` the `spotify-config.json` to the VM.

## Available Tools

### Read
- `searchSpotify` — search tracks, albums, artists, playlists
- `getNowPlaying` — current track, device, volume info
- `getMyPlaylists` — list user's playlists
- `getPlaylistTracks` — tracks in a playlist
- `getRecentlyPlayed` — recently played tracks
- `getUsersSavedTracks` — liked songs library
- `getQueue` — current queue
- `getAvailableDevices` — connected Spotify devices
- `getAlbums` — album details
- `getAlbumTracks` — tracks from an album
- `getTopTracks` — user's top tracks
- `getTopArtists` — user's top artists

### Play / Control
- `playMusic` — play a track/album/artist/playlist
- `pausePlayback` / `resumePlayback`
- `skipToNext` / `skipToPrevious`
- `setVolume` / `adjustVolume`
- `addToQueue` — queue a track

### Playlist Management
- `createPlaylist` — create new playlist
- `addTracksToPlaylist` — add tracks
- `removeTracksFromPlaylist` — remove tracks
- `reorderPlaylistItems` — reorder tracks
- `updatePlaylist` — rename, change description/visibility

### Library
- `saveOrRemoveAlbumForUser` — save/remove albums
- `checkUsersSavedAlbums` — check if albums are saved
- `removeUsersSavedTracks` — remove from liked songs
