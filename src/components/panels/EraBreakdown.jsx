import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function EraBreakdown({ data }) {
  const [selected, setSelected] = useState('');

  if (!data) return null;
  const predictions = data.predictions || [];

  const eraContext = {
    'Bebop': 'the breakneck invention of the mid-40s',
    'Hard Bop': 'the soulful, blues-drenched grooves of the late 50s',
    'Cool Jazz': 'the restrained West Coast sound',
    'Modal': 'the modal jazz revolution of the late 50s-60s',
    'Post-Bop': 'the boundary-pushing explorations after hard bop',
    'Swing': 'the big-band swing era',
    'Free Jazz': 'the avant-garde freedom of the 60s',
    'Fusion': 'the electric jazz-rock crossover',
  };

  const sorted = useMemo(() => {
    const groups = {};
    predictions.forEach(p => {
      if (!p.era || p.era === 'Unknown') return;
      groups[p.era] = groups[p.era] || [];
      groups[p.era].push(p);
    });

    return Object.entries(groups)
      .map(([era, tracks]) => ({
        era,
        avg: tracks.reduce((s, t) => s + t.actual, 0) / tracks.length,
        count: tracks.length,
        tracks,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [predictions]);

  if (!sorted.length) return null;

  const chartData = {
    labels: sorted.map(s => s.era),
    datasets: [{
      label: 'Avg Rating',
      data: sorted.map(s => Math.round(s.avg * 100) / 100),
      backgroundColor: sorted.map((_, i) => colorFor(i)),
      borderColor: sorted.map((_, i) => colorFor(i)),
      borderWidth: 1,
      borderRadius: 6,
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
            return `Avg: ${c.raw}/10 · ${item.count} track${item.count !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 11, weight: 650 } },
      },
    },
  };

  return (
    <Panel id="era-panel" span={6}>
      <PanelHeader title="Era Breakdown" note="Average rating by jazz era" />
      {sorted.length > 0 && (() => {
        const top = sorted[0];
        const context = eraContext[top.era] || `the ${top.era} period`;
        return (
          <p className="panel-insight">
            Your highest-rated era is {top.era} (avg {top.avg.toFixed(1)}). You connect most with {context}.
          </p>
        );
      })()}
      <p className="panel-desc">
        Average rating grouped by musical <strong>era</strong> — Bebop, Hard Bop, Cool Jazz, Modal, Post-Bop, Swing. Bar intensity reflects average score; track count is shown per bar. Shows where in jazz history your taste lives and which eras you've barely explored. Modal and Hard Bop dominate your dataset; this shows whether that preference actually maps to higher scores.
      </p>
      <div className="chart-shell tall">
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
                  <span className="breakdown-track-rating" style={{color: ratingColor(t.actual)}}>{t.actual}/10</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}
