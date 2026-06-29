import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip);

function ratingColor(r, alpha = 0.8) {
  if (r >= 9) return `rgba(80,200,120,${alpha})`;
  if (r >= 7) return `rgba(74,158,255,${alpha})`;
  if (r >= 5) return `rgba(255,193,68,${alpha})`;
  return `rgba(255,107,107,${alpha})`;
}

const QUADRANTS = [
  { label: 'Vibrant',     top: '6%',  left: '55%',  color: 'rgba(80,200,120,0.35)' },
  { label: 'Intense',     top: '6%',  left: '4%',   color: 'rgba(255,107,107,0.35)' },
  { label: 'Serene',      top: '74%', left: '55%',  color: 'rgba(74,158,255,0.3)' },
  { label: 'Melancholic', top: '74%', left: '4%',   color: 'rgba(255,193,68,0.3)' },
];

export default function TasteMap({ data }) {
  const ps = (data?.predictions || []).filter(p => p.moods?.length > 0 && p.avg_valence != null);
  if (ps.length < 5) return null;

  const chartData = {
    datasets: [{
      label: 'Tracks',
      data: ps.map(p => ({ x: p.avg_valence, y: p.avg_arousal, _p: p })),
      backgroundColor: ps.map(p => ratingColor(p.actual, 0.78)),
      pointRadius: 5.5,
      pointHoverRadius: 9,
    }],
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
            const topMoods = (p.moods || []).slice(0, 3).join(', ');
            return [
              `Rating: ${p.actual}/10`,
              `Valence: ${p.avg_valence.toFixed(2)}  Arousal: ${p.avg_arousal.toFixed(2)}`,
              topMoods ? `Moods: ${topMoods}` : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      x: {
        min: -1, max: 1,
        title: { display: true, text: 'Valence  (dark ← → bright)', color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
      y: {
        min: -1, max: 1,
        title: { display: true, text: 'Arousal  (calm ← → intense)', color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
    },
  };

  const loved = ps.filter(p => p.actual >= 8);
  const sweetSpot = loved.length >= 3 ? {
    v: (loved.reduce((s, p) => s + p.avg_valence, 0) / loved.length).toFixed(2),
    a: (loved.reduce((s, p) => s + p.avg_arousal, 0) / loved.length).toFixed(2),
  } : null;

  return (
    <Panel id="taste-map-panel" span={6}>
      <PanelHeader title="Taste Map" note="Your tracks in emotional space — valence × arousal" />
      {sweetSpot && (
        <p className="panel-insight">
          Your sweet spot is around valence {sweetSpot.v}, arousal {sweetSpot.a} — the centroid of your loved tracks. That's the emotional territory where jazz lands for you.
        </p>
      )}
      <div style={{ position: 'relative' }}>
        {QUADRANTS.map(q => (
          <span key={q.label} style={{
            position: 'absolute',
            top: q.top,
            left: q.left,
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: q.color,
            pointerEvents: 'none',
            zIndex: 1,
          }}>{q.label}</span>
        ))}
        <div className="chart-shell" style={{ height: 320 }}>
          <Scatter data={chartData} options={options} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {[['≥9','#50c878'],['7–8','#4a9eff'],['5–6','#ffc144'],['≤4','#ff6b6b']].map(([lbl, col]) => (
          <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.73rem', color: 'var(--muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: col, display: 'inline-block' }} />
            {lbl}
          </span>
        ))}
      </div>
    </Panel>
  );
}
