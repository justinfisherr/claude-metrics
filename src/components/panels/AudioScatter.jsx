import { useState, useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip);

const FEATURES = [
  { key: 'spotify_valence',   label: 'Valence',         min: 0,   max: 1,   fmt: v => v.toFixed(2) },
  { key: 'spotify_energy',    label: 'Energy',           min: 0,   max: 1,   fmt: v => v.toFixed(2) },
  { key: 'acousticness',      label: 'Acousticness',     min: 0,   max: 1,   fmt: v => v.toFixed(2) },
  { key: 'danceability',      label: 'Danceability',     min: 0,   max: 1,   fmt: v => v.toFixed(2) },
  { key: 'instrumentalness',  label: 'Instrumentalness', min: 0,   max: 1,   fmt: v => v.toFixed(3) },
  { key: 'liveness',          label: 'Liveness',         min: 0,   max: 1,   fmt: v => v.toFixed(2) },
  { key: 'loudness',          label: 'Loudness (dB)',    min: -35, max: 0,   fmt: v => v.toFixed(1) + ' dB' },
  { key: 'speechiness',       label: 'Speechiness',      min: 0,   max: 0.5, fmt: v => v.toFixed(3) },
  { key: 'popularity',        label: 'Popularity',       min: 0,   max: 100, fmt: v => String(v) },
];

function ratingColor(r, alpha = 0.8) {
  if (r >= 9) return `rgba(80,200,120,${alpha})`;
  if (r >= 7) return `rgba(74,158,255,${alpha})`;
  if (r >= 5) return `rgba(255,193,68,${alpha})`;
  return `rgba(255,107,107,${alpha})`;
}

function norm(val, min, max) {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

export default function AudioScatter({ data }) {
  const [xKey, setXKey] = useState('spotify_valence');
  const [yKey, setYKey] = useState('spotify_energy');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const xFeat = FEATURES.find(f => f.key === xKey);
  const yFeat = FEATURES.find(f => f.key === yKey);

  const { matched, unmatched } = useMemo(() => {
    const all = (data?.predictions || []).filter(
      p => p[xKey] != null && p[yKey] != null
    );
    const q = search.trim().toLowerCase();
    if (!q) return { matched: [], unmatched: all };
    const m = [], u = [];
    for (const p of all) {
      (p.title.toLowerCase().includes(q) || p.artist.toLowerCase().includes(q) ? m : u).push(p);
    }
    return { matched: m, unmatched: u };
  }, [data, xKey, yKey, search]);

  const hasSearch = search.trim().length > 0;

  const chartData = {
    datasets: [
      {
        label: 'Tracks',
        data: unmatched.map(p => ({ x: p[xKey], y: p[yKey], _p: p })),
        backgroundColor: unmatched.map(p => ratingColor(p.actual, hasSearch ? 0.18 : 0.75)),
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      ...(matched.length ? [{
        label: 'Match',
        data: matched.map(p => ({ x: p[xKey], y: p[yKey], _p: p })),
        backgroundColor: matched.map(p => ratingColor(p.actual, 1)),
        borderColor: '#fff',
        borderWidth: 2,
        pointRadius: 10,
        pointHoverRadius: 13,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evt, elements, chart) => {
      if (!elements.length) { setSelected(null); return; }
      const { datasetIndex, index } = elements[0];
      setSelected(chart.data.datasets[datasetIndex].data[index]._p);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c1a2e',
        borderColor: 'rgba(93,155,224,0.3)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#fff',
        titleFont: { size: 13, weight: 700 },
        bodyColor: GR.tick,
        callbacks: {
          title: items => {
            const p = items[0].raw._p;
            return `${p.title} — ${p.artist}`;
          },
          label: item => {
            const p = item.raw._p;
            return [
              `Rating: ${p.actual}/10`,
              `${xFeat.label}: ${xFeat.fmt(p[xKey])}`,
              `${yFeat.label}: ${yFeat.fmt(p[yKey])}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        min: xFeat.min, max: xFeat.max,
        title: { display: true, text: xFeat.label, color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        min: yFeat.min, max: yFeat.max,
        title: { display: true, text: yFeat.label, color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
    },
  };

  return (
    <Panel id="audio-scatter-panel" span={12}>
      <PanelHeader title="Audio Feature Explorer" note="Pick any two dimensions — hover for details, click to inspect, search to find a track" />

      <div className="audio-scatter-controls">
        <div className="audio-scatter-axis-group">
          <label className="audio-scatter-axis-label">X</label>
          <select value={xKey} onChange={e => setXKey(e.target.value)} className="version-select">
            {FEATURES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <div className="audio-scatter-axis-group">
          <label className="audio-scatter-axis-label">Y</label>
          <select value={yKey} onChange={e => setYKey(e.target.value)} className="version-select">
            {FEATURES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <input
          className="audio-scatter-search"
          type="text"
          placeholder="Search track or artist…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null); }}
        />
        <div className="audio-scatter-legend">
          {[['≥9','#50c878'],['7–8','#4a9eff'],['5–6','#ffc144'],['≤4','#ff6b6b']].map(([lbl, col]) => (
            <span key={lbl} className="audio-scatter-legend-item">
              <span style={{ background: col }} className="audio-scatter-legend-dot" />
              {lbl}
            </span>
          ))}
        </div>
      </div>

      <div className="chart-shell" style={{ height: 420 }}>
        <Scatter data={chartData} options={options} />
      </div>

      {selected && (
        <div className="audio-detail-card">
          <div className="audio-detail-header">
            <div>
              <div className="audio-detail-title">{selected.title}</div>
              <div className="audio-detail-meta">{selected.artist} · {selected.era} · {selected.year}</div>
            </div>
            <div className="audio-detail-right">
              <span className="audio-detail-rating" style={{ color: ratingColor(selected.actual, 1) }}>
                {selected.actual}/10
              </span>
              <button className="audio-detail-close" onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>
          <div className="audio-detail-bars">
            {FEATURES.filter(f => f.key !== 'popularity').map(f => {
              const val = selected[f.key];
              if (val == null) return null;
              const pct = norm(val, f.min, f.max) * 100;
              return (
                <div key={f.key} className="audio-bar-row">
                  <span className="audio-bar-label">{f.label}</span>
                  <div className="audio-bar-track">
                    <div className="audio-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="audio-bar-value">{f.fmt(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}
