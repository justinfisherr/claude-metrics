import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const ZONE_COLORS = {
  euphoric: '#ffc832',
  tense: '#c83232',
  introspective: '#646496',
  serene: '#64c896',
};

export default function MoodZoneTracks({ data }) {
  const [activeZone, setActiveZone] = useState('euphoric');

  const zones = useMemo(() => {
    if (!data?.predictions) return {};

    const ps = data.predictions.filter(p => p.mood_zone);
    const grouped = {};

    ['euphoric', 'tense', 'introspective', 'serene'].forEach(zone => {
      grouped[zone] = ps
        .filter(p => p.mood_zone === zone)
        .sort((a, b) => b.actual - a.actual);
    });

    return grouped;
  }, [data]);

  if (!zones || Object.values(zones).every(z => z.length === 0)) return null;

  const activeZoneTracks = zones[activeZone] || [];

  return (
    <Panel id="mood-zone-tracks" span={12}>
      <PanelHeader title="Tracks by Mood Zone" />
      <div style={{ padding: '1rem 0' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #333' }}>
          {['euphoric', 'tense', 'introspective', 'serene'].map(zone => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: activeZone === zone ? ZONE_COLORS[zone] : 'transparent',
                color: activeZone === zone ? '#000' : '#ccc',
                border: `1px solid ${ZONE_COLORS[zone]}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeZone === zone ? 'bold' : 'normal',
              }}
            >
              {zone.charAt(0).toUpperCase() + zone.slice(1)} ({zones[zone]?.length || 0})
            </button>
          ))}
        </div>

        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {activeZoneTracks.length === 0 ? (
            <div style={{ color: '#999', padding: '1rem' }}>No tracks in this zone</div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Track</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem' }}>Rating</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem' }}>Dance</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem' }}>Val</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem' }}>Eng</th>
                </tr>
              </thead>
              <tbody>
                {activeZoneTracks.map((track, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '0.5rem', color: '#bbb' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{track.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999' }}>{track.artist}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 'bold', color: '#ffc832' }}>
                      {track.actual}/10
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                      {track.danceability != null ? track.danceability.toFixed(2) : '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                      {track.spotify_valence != null ? track.spotify_valence.toFixed(2) : '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                      {track.spotify_energy != null ? track.spotify_energy.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Panel>
  );
}
