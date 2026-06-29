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

export default function TopArtists({ data }) {
  const [selected, setSelected] = useState('');

  if (!data) return null;
  const predictions = data.predictions || [];

  const sorted = useMemo(() => {
    const groups = {};
    predictions.forEach(p => {
      groups[p.artist] = groups[p.artist] || [];
      groups[p.artist].push(p);
    });

    return Object.entries(groups)
      .filter(([, r]) => r.length >= 2)
      .map(([artist, tracks]) => ({
        artist,
        avg: tracks.reduce((s, t) => s + t.actual, 0) / tracks.length,
        bayes_avg: tracks[0]?.artist_mean_rating || (tracks.reduce((s, t) => s + t.actual, 0) / tracks.length),
        count: tracks.length,
        tracks,
      }))
      .sort((a, b) => b.bayes_avg - a.bayes_avg);
  }, [predictions]);

  if (!sorted.length) return null;

  const chartData = {
    labels: sorted.map(s => s.artist),
    datasets: [{
      label: 'Bayesian Avg Rating',
      data: sorted.map(s => Math.round(s.bayes_avg * 100) / 100),
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
      if (elements.length) setSelected(sorted[elements[0].index].artist);
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
    <Panel id="top-artists-panel" span={6}>
      <PanelHeader title="Top Artists" note="Average rating per artist (2+ tracks)" />
      {sorted.length > 0 && (() => {
        const top = sorted[0];
        const obs = top.count >= 5
          ? `Across ${top.count} tracks, that consistency is remarkable.`
          : `With ${top.count} tracks logged, there's room to explore more of their catalog.`;
        return (
          <p className="panel-insight">
            Your top-rated artist is {top.artist} (avg {top.avg.toFixed(1)} across {top.count} tracks). {obs}
          </p>
        );
      })()}
      <p className="panel-desc">
        Artists with at least <strong>2 rated tracks</strong>, sorted by average score. Bar width = average rating; number on the right = track count. Shows who you consistently love vs. who you return to hoping it clicks. An artist with a high average and many tracks is a proven anchor; an artist with a high average but only 2–3 tracks is worth exploring more.
      </p>
      <div className="chart-shell tall">
        <Bar data={chartData} options={options} />
      </div>
      {selected && (() => {
        const item = sorted.find(s => s.artist === selected);
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
