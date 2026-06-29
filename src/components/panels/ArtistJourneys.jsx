import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

function getRatingDistribution(tracks) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  tracks.forEach(t => {
    const r = Math.round(t.actual);
    if (r in counts) counts[r]++;
  });
  return counts;
}

function ratingBlockColor(r) {
  if (r >= 9) return 'rgba(80,200,120,0.82)';
  if (r >= 7) return 'rgba(74,158,255,0.72)';
  if (r >= 5) return 'rgba(255,193,68,0.68)';
  return 'rgba(255,107,107,0.68)';
}

const ZONE_COLORS = {
  euphoric: '#ffc832',
  tense: '#c83232',
  introspective: '#6464aa',
  serene: '#64c896',
  null: '#555',
};

export default function ArtistJourneys({ data }) {
  const [activeZone, setActiveZone] = useState('all');

  if (!data) return null;
  const predictions = data.predictions || [];

  const { all, byZone, maxDur } = useMemo(() => {
    // Build "all" artists (3+ tracks total)
    const allArtists = {};
    predictions.forEach(p => {
      allArtists[p.artist] = allArtists[p.artist] || [];
      allArtists[p.artist].push(p);
    });

    const allArtistsArray = Object.entries(allArtists)
      .filter(([, t]) => t.length >= 3)
      .map(([name, tracks]) => ({
        name,
        tracks,
        mean: tracks.reduce((sum, t) => sum + t.actual, 0) / tracks.length,
      }))
      .sort((a, b) => b.mean - a.mean || a.name.localeCompare(b.name))
      .slice(0, 12); // Cap at 12

    // Build by-zone artists (2+ tracks in that zone)
    const byZoneObj = {
      euphoric: [],
      tense: [],
      introspective: [],
      serene: [],
    };

    Object.keys(byZoneObj).forEach(zone => {
      const zoneArtists = {};
      predictions
        .filter(p => p.mood_zone === zone)
        .forEach(p => {
          zoneArtists[p.artist] = zoneArtists[p.artist] || [];
          zoneArtists[p.artist].push(p);
        });

      byZoneObj[zone] = Object.entries(zoneArtists)
        .filter(([, t]) => t.length >= 2)
        .map(([name, tracks]) => ({
          name,
          tracks,
          mean: tracks.reduce((sum, t) => sum + t.actual, 0) / tracks.length,
        }))
        .sort((a, b) => b.mean - a.mean || a.name.localeCompare(b.name))
        .slice(0, 10); // Cap at 10 per zone
    });

    // Zone track counts
    const zoneCounts = {
      euphoric: predictions.filter(p => p.mood_zone === 'euphoric').length,
      tense: predictions.filter(p => p.mood_zone === 'tense').length,
      introspective: predictions.filter(p => p.mood_zone === 'introspective').length,
      serene: predictions.filter(p => p.mood_zone === 'serene').length,
    };

    const md = Math.max(...predictions.map(p => p.duration_s || 300));

    return { all: allArtistsArray, byZone: { ...byZoneObj, zoneCounts }, maxDur: md };
  }, [predictions]);

  if (!all.length) return null;

  const activeData = activeZone === 'all' ? all : byZone[activeZone];
  const displayTracks = activeZone === 'all'
    ? all.flatMap(a => a.tracks)
    : byZone[activeZone].flatMap(a => a.tracks);

  const insight = (() => {
    const withRange = activeData.map(a => ({
      ...a,
      min: Math.min(...a.tracks.map(t => t.actual)),
      max: Math.max(...a.tracks.map(t => t.actual)),
      range: Math.max(...a.tracks.map(t => t.actual)) - Math.min(...a.tracks.map(t => t.actual)),
    }));
    if (!withRange.length) return null;
    const widest = withRange.reduce((a, b) => b.range > a.range ? b : a);
    const interp = widest.range >= 5
      ? `Same artist, wildly different outcomes — the track matters more than the name.`
      : `Even the widest spread is moderate, suggesting your taste aligns with the artist overall.`;
    return (
      <p className="panel-insight">
        Artist with the widest rating range: {widest.name} ({widest.min}–{widest.max}). {interp}
      </p>
    );
  })();

  return (
    <Panel id="artist-journeys-panel" span={12}>
      <PanelHeader title="Artist Journeys" note="Faceted by mood zone — each block is a track" />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #333' }}>
        {[
          { zone: 'all', label: `All (${all.length})` },
          { zone: 'euphoric', label: `Euphoric (${byZone.zoneCounts.euphoric})` },
          { zone: 'tense', label: `Tense (${byZone.zoneCounts.tense})` },
          { zone: 'introspective', label: `Introspective (${byZone.zoneCounts.introspective})` },
          { zone: 'serene', label: `Serene (${byZone.zoneCounts.serene})` },
        ].map(({ zone, label }) => (
          <button
            key={zone}
            onClick={() => setActiveZone(zone)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeZone === zone ? ZONE_COLORS[zone] : 'transparent',
              color: activeZone === zone ? '#000' : '#ccc',
              border: `1px solid ${ZONE_COLORS[zone] || '#666'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeZone === zone ? 'bold' : 'normal',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {insight}

      <p className="panel-desc">
        <strong>Card view</strong>: Each card shows an artist's mean rating and track count with a mini rating distribution. Scales responsively on all screen sizes.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px',
        marginTop: '1rem',
      }}>
        {activeData.map(({ name, tracks, mean }) => {
          const dist = getRatingDistribution(tracks);
          return (
            <div
              key={name}
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px' }}>
                {mean.toFixed(1)}/10
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '8px' }}>
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: '2px', height: '20px' }}>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => {
                  const count = dist[rating] || 0;
                  const maxCount = Math.max(...Object.values(dist));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={rating}
                      style={{
                        flex: 1,
                        height: '100%',
                        background: count > 0 ? ratingBlockColor(rating) : 'rgba(255,255,255,0.05)',
                        borderRadius: '2px',
                        opacity: count > 0 ? 1 : 0.3,
                        minHeight: `${height}%`,
                        alignSelf: 'flex-end',
                      }}
                      title={`${rating}/10: ${count} track${count !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
