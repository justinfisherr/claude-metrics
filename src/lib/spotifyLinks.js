export function spotifyAppUri(kind, id) {
  return id ? `spotify:${kind}:${id}` : null;
}
