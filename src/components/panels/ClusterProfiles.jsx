import { useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CLUSTER_NAMES = ['Romantic', 'Contemplative', 'Groovy'];

const CLUSTER_COLORS_FULL = [
  'rgba(74, 158, 255, 0.86)',
  'rgba(255, 107, 107, 0.86)',
  'rgba(80, 200, 120, 0.86)',
  'rgba(255, 193, 68, 0.86)',
  'rgba(178, 117, 255, 0.86)',
  'rgba(75, 220, 225, 0.86)',
];

const ZONE_COLORS = {
  euphoric: 'rgba(255, 200, 50, 0.8)',
  tense: 'rgba(200, 50, 50, 0.8)',
  introspective: 'rgba(100, 100, 150, 0.8)',
  serene: 'rgba(100, 200, 150, 0.8)',
};

function colorFor(index) {
  return CLUSTER_COLORS_FULL[index % CLUSTER_COLORS_FULL.length];
}

function profilesFrom(data) {
  const raw = data?.clusters?.cluster_profiles || [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

export default function ClusterProfiles({ data }) {
  const [selected, setSelected] = useState(null);

  if (!data) return null;

  const profiles = profilesFrom(data);
  if (!profiles.length) return null;

  const zones = ['euphoric', 'tense', 'introspective', 'serene'];
  const chartData = {
    labels: profiles.map((p, i) => CLUSTER_NAMES[i] || `Cluster ${i}`),
    datasets: zones.map(zone => ({
      label: zone.charAt(0).toUpperCase() + zone.slice(1),
      data: profiles.map(p => p.mood_zone_distribution?.[zone] || 0),
      backgroundColor: ZONE_COLORS[zone],
      borderColor: ZONE_COLORS[zone],
      borderWidth: 1,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
      },
    },
    scales: {
      x: {
        min: 0,
        max: 1,
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
    },
  };

  return (
    <Panel id="cluster-profiles-panel" span={6}>
      <PanelHeader title="Cluster Mood Zones" note="Mood zone distribution per cluster" />
      {(() => {
        const sorted = [...profiles].sort((a, b) => (b.mean_rating || 0) - (a.mean_rating || 0));
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        if (!best || !worst || sorted.length < 2) return null;
        const bestZone = best.top_mood_zones?.[0] || 'mixed';
        const worstZone = worst.top_mood_zones?.[0] || 'mixed';
        return (
          <p className="panel-insight">
            Your strongest cluster averages {best.mean_rating}/10, with {bestZone} energy. Your weakest averages {worst.mean_rating}/10 — those tracks tend toward {worstZone}.
          </p>
        );
      })()}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="breakdown-dropdown">
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>
          {profiles.map((profile, index) => (
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
              {CLUSTER_NAMES[index] || `C${index}`}
            </button>
          ))}
        </div>
        {selected != null && (() => {
          const predictions = data?.predictions || [];
          const tracks = predictions
            .filter(p => p.cluster === selected)
            .sort((a, b) => b.actual - a.actual);
          if (!tracks.length) return null;
          return (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <strong style={{color:'var(--accent)',fontSize:'0.82rem'}}>{CLUSTER_NAMES[selected] || `Cluster ${selected}`} ({tracks.length} tracks)</strong>
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
