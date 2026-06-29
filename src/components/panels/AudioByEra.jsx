import { useMemo, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FEATURES = [
  { key: 'acousticness',     label: 'Acoustic',    min: 0,   max: 1   },
  { key: 'spotify_valence',  label: 'Valence',      min: 0,   max: 1   },
  { key: 'danceability',     label: 'Dance',        min: 0,   max: 1   },
  { key: 'spotify_energy',   label: 'Energy',       min: 0,   max: 1   },
  { key: 'instrumentalness', label: 'Instrumental', min: 0,   max: 1   },
  { key: 'liveness',         label: 'Liveness',     min: 0,   max: 1   },
  { key: 'loudness',         label: 'Loudness',     min: -30, max: 0   },
  { key: 'speechiness',      label: 'Speech',       min: 0,   max: 0.5 },
];

const ERA_COLORS = [
  'rgba(74,158,255,0.8)',
  'rgba(80,200,120,0.8)',
  'rgba(255,193,68,0.8)',
  'rgba(255,107,107,0.8)',
  'rgba(180,120,255,0.8)',
  'rgba(255,160,80,0.8)',
  'rgba(100,220,220,0.8)',
];

function norm(val, min, max) {
  return val == null ? null : Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function avgFeature(tracks, key, min, max) {
  const vals = tracks.map(p => norm(p[key], min, max)).filter(v => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export default function AudioByEra({ data }) {
  const { eras, profiles } = useMemo(() => {
    const ps = (data?.predictions || []).filter(p => FEATURES.some(f => p[f.key] != null));
    const byEra = {};
    for (const p of ps) {
      const era = p.era || 'Unknown';
      if (!byEra[era]) byEra[era] = [];
      byEra[era].push(p);
    }
    const sorted = Object.entries(byEra)
      .filter(([, tracks]) => tracks.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    const eras = sorted.map(([era]) => era);
    const profiles = sorted.map(([, tracks]) =>
      FEATURES.map(({ key, min, max }) => {
        const v = avgFeature(tracks, key, min, max);
        return v != null ? parseFloat(v.toFixed(3)) : 0;
      })
    );
    return { eras, profiles };
  }, [data]);

  const [hidden, setHidden] = useState({});

  if (!eras.length) return null;

  const toggle = era => setHidden(h => ({ ...h, [era]: !h[era] }));

  const chartData = {
    labels: FEATURES.map(f => f.label),
    datasets: eras.map((era, i) => ({
      label: era,
      data: hidden[era] ? FEATURES.map(() => 0) : profiles[i],
      backgroundColor: ERA_COLORS[i % ERA_COLORS.length].replace('0.8)', '0.07)'),
      borderColor: ERA_COLORS[i % ERA_COLORS.length],
      borderWidth: hidden[era] ? 0 : 2,
      pointBackgroundColor: ERA_COLORS[i % ERA_COLORS.length],
      pointRadius: hidden[era] ? 0 : 3,
      fill: true,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c1a2e',
        borderColor: 'rgba(93,155,224,0.3)',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(0)}%`,
        },
      },
    },
    scales: {
      r: {
        min: 0, max: 1,
        ticks: { display: false },
        grid: { color: 'rgba(255,255,255,0.06)' },
        angleLines: { color: 'rgba(255,255,255,0.06)' },
        pointLabels: { color: '#9aacbf', font: { size: 10.5, weight: '700' } },
      },
    },
  };

  return (
    <Panel id="audio-by-era-panel" span={12}>
      <PanelHeader title="Sound of Each Era" note="ReccoBeats audio fingerprint per era — toggle eras to compare" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {eras.map((era, i) => (
          <button
            key={era}
            onClick={() => toggle(era)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              border: `1px solid ${ERA_COLORS[i % ERA_COLORS.length]}`,
              background: hidden[era] ? 'transparent' : ERA_COLORS[i % ERA_COLORS.length].replace('0.8)', '0.15)'),
              color: hidden[era] ? 'var(--muted)' : ERA_COLORS[i % ERA_COLORS.length],
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              opacity: hidden[era] ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >
            {era}
          </button>
        ))}
      </div>
      <div className="chart-shell" style={{ height: 380 }}>
        <Radar data={chartData} options={options} />
      </div>
    </Panel>
  );
}
