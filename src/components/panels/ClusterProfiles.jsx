import { useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

const CLUSTER_COLORS_FULL = [
  'rgba(74, 158, 255, 0.86)',
  'rgba(255, 107, 107, 0.86)',
  'rgba(80, 200, 120, 0.86)',
  'rgba(255, 193, 68, 0.86)',
  'rgba(178, 117, 255, 0.86)',
  'rgba(75, 220, 225, 0.86)',
];

const CLUSTER_BG = [
  'rgba(74, 158, 255, 0.13)',
  'rgba(255, 107, 107, 0.13)',
  'rgba(80, 200, 120, 0.13)',
  'rgba(255, 193, 68, 0.13)',
  'rgba(178, 117, 255, 0.13)',
  'rgba(75, 220, 225, 0.13)',
];

function colorFor(index) {
  return CLUSTER_COLORS_FULL[index % CLUSTER_COLORS_FULL.length];
}

function bgFor(index) {
  return CLUSTER_BG[index % CLUSTER_BG.length];
}

function profilesFrom(data) {
  const raw = data?.clusters?.cluster_profiles || [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

export default function ClusterProfiles({ data }) {
  const [selected, setSelected] = useState(null);

  if (!data) return null;

  const profiles = profilesFrom(data).filter(p => p?.radar?.labels?.length);
  if (!profiles.length) return null;

  const chartData = {
    labels: profiles[0].radar.labels,
    datasets: profiles.map((profile, index) => ({
      label: profile.top_moods?.slice(0, 2).join(', ') || `Cluster ${index + 1}`,
      data: profile.radar.values,
      borderColor: colorFor(index),
      backgroundColor: bgFor(index),
      pointBackgroundColor: colorFor(index),
      pointBorderColor: '#0f1f38',
      pointRadius: 3,
      borderWidth: 1.8,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#d7e6f7', boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 11, weight: 650 } },
      },
      tooltip: {
        backgroundColor: '#0f1f38',
        borderColor: 'rgba(93, 155, 224, 0.26)',
        borderWidth: 1,
        padding: 10,
        titleColor: '#fff',
        bodyColor: '#d7e6f7',
        displayColors: true,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 1,
        grid: { color: GR.grid },
        angleLines: { color: GR.grid },
        pointLabels: { color: '#d7e6f7', font: { size: 10, weight: 650 } },
        ticks: { display: false },
      },
    },
  };

  return (
    <Panel id="radar-panel" span={6}>
      <PanelHeader title="Cluster Profiles" note="Feature fingerprints for each cluster" />
      {(() => {
        const sorted = [...profiles].sort((a, b) => (b.mean_rating || 0) - (a.mean_rating || 0));
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        if (!best || !worst || sorted.length < 2) return null;
        const bestMoods = best.top_moods?.slice(0, 2).join(' and ') || 'mixed';
        const worstMoods = worst.top_moods?.slice(0, 2).join(' and ') || 'mixed';
        return (
          <p className="panel-insight">
            Your strongest zone averages {best.mean_rating}/10, defined by {bestMoods} tracks. Your weakest zone averages {worst.mean_rating}/10 — those tend to be {worstMoods}.
          </p>
        );
      })()}
      <p className="panel-desc">
        A radar chart overlaying each cluster's average feature values. <strong>Axes</strong>: <code>Energy</code> (0&ndash;1, normalized from the 1&ndash;10 scale), <code>Complexity</code> (low/med/high &rarr; 0&ndash;1), <code>Tempo</code> (slow&ndash;fast &rarr; 0&ndash;1), then seven <strong>mood frequencies</strong> — the fraction of tracks in that cluster carrying each mood tag (romantic, tender, joyful, bluesy, cool, melancholic, sensual). Clusters that peak on different axes have meaningfully distinct sonic characters. A cluster with a wide romantic + tender footprint but low energy maps directly to your known ballad preference.
      </p>
      <div className="chart-shell">
        <Radar data={chartData} options={chartOptions} />
      </div>
      <div className="breakdown-dropdown">
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
          {profiles.map((profile, index) => {
            const label = profile.top_moods?.slice(0, 2).join(', ') || `Cluster ${index + 1}`;
            return (
              <button
                key={index}
                onClick={() => setSelected(selected === index ? null : index)}
                style={{
                  background: selected === index ? colorFor(index) : 'transparent',
                  border: `1px solid ${colorFor(index)}`,
                  color: selected === index ? '#0f1f38' : colorFor(index),
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 650,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {selected != null && (() => {
          const predictions = data?.predictions || [];
          const tracks = predictions
            .filter(p => p.cluster === selected)
            .sort((a, b) => b.actual - a.actual);
          if (!tracks.length) return null;
          const label = profiles[selected]?.top_moods?.slice(0, 2).join(', ') || `Cluster ${selected + 1}`;
          return (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <strong style={{color:'var(--accent)',fontSize:'0.82rem'}}>{label} ({tracks.length} tracks)</strong>
                <button onClick={() => setSelected(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'0.8rem'}}>&#10005; Close</button>
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
            </>
          );
        })()}
      </div>
    </Panel>
  );
}
