import { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const AXES = [
  { key: 'acousticness',     label: 'Acoustic',      min: 0,   max: 1   },
  { key: 'spotify_valence',  label: 'Valence',        min: 0,   max: 1   },
  { key: 'danceability',     label: 'Danceability',   min: 0,   max: 1   },
  { key: 'spotify_energy',   label: 'Energy',         min: 0,   max: 1   },
  { key: 'instrumentalness', label: 'Instrumental',   min: 0,   max: 1   },
  { key: 'liveness',         label: 'Liveness',       min: 0,   max: 1   },
  { key: 'loudness',         label: 'Loudness',       min: -30, max: 0   },
  { key: 'speechiness',      label: 'Speechiness',    min: 0,   max: 0.5 },
];

function norm(val, min, max) {
  if (val == null) return null;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function avg(group, key, min, max) {
  const vals = group.map(p => norm(p[key], min, max)).filter(v => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export default function SoundDNA({ data }) {
  const { loved, disliked, hasBoth, biggestGap } = useMemo(() => {
    const ps = (data?.predictions || []).filter(p => AXES.some(a => p[a.key] != null));
    const loved = ps.filter(p => p.actual >= 8);
    const disliked = ps.filter(p => p.actual < 5);

    const lovedProfile = AXES.map(({ key, min, max }) => avg(loved, key, min, max));
    const dislikedProfile = AXES.map(({ key, min, max }) => avg(disliked, key, min, max));

    const gaps = AXES.map((a, i) => ({ label: a.label, gap: Math.abs(lovedProfile[i] - dislikedProfile[i]) }));
    const biggestGap = gaps.sort((a, b) => b.gap - a.gap)[0];

    return {
      loved: lovedProfile,
      disliked: dislikedProfile,
      hasBoth: loved.length > 0 && disliked.length > 0,
      biggestGap,
    };
  }, [data]);

  if (!hasBoth) return null;

  const chartData = {
    labels: AXES.map(a => a.label),
    datasets: [
      {
        label: 'Loved (≥8)',
        data: loved,
        backgroundColor: 'rgba(80,200,120,0.12)',
        borderColor: 'rgba(80,200,120,0.85)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(80,200,120,0.9)',
        pointRadius: 3,
        fill: true,
      },
      {
        label: 'Disliked (<5)',
        data: disliked,
        backgroundColor: 'rgba(255,107,107,0.08)',
        borderColor: 'rgba(255,107,107,0.7)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255,107,107,0.85)',
        pointRadius: 3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#9aacbf', font: { size: 11, weight: '600' }, boxWidth: 12, padding: 16 },
      },
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
        min: 0,
        max: 1,
        ticks: { display: false, stepSize: 0.25 },
        grid: { color: 'rgba(255,255,255,0.06)' },
        angleLines: { color: 'rgba(255,255,255,0.06)' },
        pointLabels: {
          color: '#9aacbf',
          font: { size: 10.5, weight: '700' },
        },
      },
    },
  };

  return (
    <Panel id="sound-dna-panel" span={6}>
      <PanelHeader title="Sound DNA" note="Your audio fingerprint — loved vs disliked tracks" />
      {biggestGap && (
        <p className="panel-insight">
          The biggest gap between what you love and skip is <strong>{biggestGap.label}</strong> — that single axis separates your hits from your misses most clearly.
        </p>
      )}
      <div className="chart-shell" style={{ height: 300 }}>
        <Radar data={chartData} options={options} />
      </div>
    </Panel>
  );
}
