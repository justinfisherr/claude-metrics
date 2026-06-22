import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function ptColor(pct) {
  if (pct >= 0.9) return { bg: 'rgba(80,200,120,0.65)', border: 'rgba(80,200,120,1)' };
  if (pct >= 0.75) return { bg: 'rgba(74,158,255,0.65)', border: 'rgba(74,158,255,1)' };
  if (pct >= 0.6) return { bg: 'rgba(255,193,68,0.65)', border: 'rgba(255,193,68,1)' };
  return { bg: 'rgba(255,107,107,0.65)', border: 'rgba(255,107,107,1)' };
}

export default function PlaythroughByEra({ data }) {
  const [selected, setSelected] = useState('');

  if (!data) return null;
  const predictions = data.predictions || [];

  const sorted = useMemo(() => {
    const groups = {};
    predictions.forEach(p => {
      if (!p.era || p.playthrough == null) return;
      if (!groups[p.era]) groups[p.era] = [];
      groups[p.era].push(p);
    });

    return Object.entries(groups)
      .filter(([, tracks]) => tracks.length >= 2)
      .map(([era, tracks]) => ({
        era,
        avg: tracks.reduce((s, t) => s + t.playthrough, 0) / tracks.length,
        count: tracks.length,
        tracks,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [predictions]);

  if (!sorted.length) {
    return (
      <Panel id="playthrough-era-panel" span={6}>
        <PanelHeader title="Playthrough by Era" note="Which eras hold your attention" />
        <div className="empty-state">No playthrough data yet.</div>
      </Panel>
    );
  }

  const chartData = {
    labels: sorted.map(s => s.era),
    datasets: [{
      label: 'Avg Playthrough',
      data: sorted.map(s => Math.round(s.avg * 100)),
      backgroundColor: sorted.map(s => ptColor(s.avg).bg),
      borderColor: sorted.map(s => ptColor(s.avg).border),
      borderWidth: 1.5,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    interaction: { mode: 'nearest', intersect: false },
    onClick: (evt, elements) => {
      if (elements.length) setSelected(sorted[elements[0].index].era);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1f38',
        borderColor: 'rgba(93, 155, 224, 0.26)',
        borderWidth: 1,
        padding: 10,
        titleColor: '#fff',
        bodyColor: GR.tick,
        displayColors: true,
        callbacks: {
          label: c => {
            const item = sorted[c.dataIndex];
            return `Avg: ${c.raw}% · ${item.count} track${item.count !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, callback: v => v + '%' },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 11, weight: 650 } },
      },
    },
  };

  const topEra = sorted[0];
  const bottomEra = sorted[sorted.length - 1];

  return (
    <Panel id="playthrough-era-panel" span={6}>
      <PanelHeader title="Playthrough by Era" note="Which eras hold your attention" />
      {topEra && (
        <p className="panel-insight">
          You listen longest to {topEra.era} tracks ({Math.round(topEra.avg * 100)}% avg playthrough).{' '}
          {sorted.length > 1
            ? `${bottomEra.era} holds you least (${Math.round(bottomEra.avg * 100)}%) — ${
                topEra.avg - bottomEra.avg > 0.2
                  ? 'the era gap is real, those tracks lose you well before the outro.'
                  : 'though the difference is slim — you give most eras a fair shake.'
              }`
            : 'Not enough eras to compare yet.'}
        </p>
      )}
      <p className="panel-desc">
        Average playthrough percentage per era. Shows which musical eras keep you listening vs which ones you bail on. A low bar means you're skipping early — the era isn't holding you regardless of individual track quality.
      </p>
      <div className="chart-shell">
        <Bar data={chartData} options={options} />
      </div>
      {selected && (() => {
        const item = sorted.find(s => s.era === selected);
        if (!item) return null;
        const tracks = [...item.tracks].sort((a, b) => b.actual - a.actual);
        return (
          <div className="breakdown-dropdown">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <strong style={{color:'var(--accent)',fontSize:'0.82rem'}}>{selected}</strong>
              <button onClick={() => setSelected('')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'0.8rem'}}>&#10005; Close</button>
            </div>
            <div className="breakdown-tracks">
              {tracks.map((t, i) => (
                <div key={i} className="breakdown-track">
                  <div>
                    <span className="breakdown-track-title">{t.title}</span>
                    <span className="breakdown-track-artist">— {t.artist}</span>
                  </div>
                  <span className="breakdown-track-rating" style={{color: ratingColor(t.actual)}}>{t.actual}/10 · {Math.round(t.playthrough * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}
