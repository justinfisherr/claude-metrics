import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const FEATURES = [
  { key: 'acousticness',     label: 'Acousticness',  min: 0,   max: 1   },
  { key: 'spotify_valence',  label: 'Valence',        min: 0,   max: 1   },
  { key: 'danceability',     label: 'Danceability',   min: 0,   max: 1   },
  { key: 'spotify_energy',   label: 'Energy',         min: 0,   max: 1   },
  { key: 'instrumentalness', label: 'Instrumental',   min: 0,   max: 1   },
  { key: 'liveness',         label: 'Liveness',       min: 0,   max: 1   },
  { key: 'loudness',         label: 'Loudness',       min: -30, max: 0   },
  { key: 'speechiness',      label: 'Speechiness',    min: 0,   max: 0.5 },
];

function avgRating(tracks) {
  if (!tracks.length) return null;
  return tracks.reduce((s, t) => s + t.actual, 0) / tracks.length;
}

export default function AudioFeatureRatings({ data }) {
  const { labels, highAvgs, lowAvgs, bestFeature } = useMemo(() => {
    const ps = (data?.predictions || []);

    const labels = [], highAvgs = [], lowAvgs = [];
    let best = null, bestDelta = 0;

    for (const { key, label } of FEATURES) {
      const withFeature = ps.filter(p => p[key] != null);
      if (withFeature.length < 6) continue;

      const sorted = [...withFeature].sort((a, b) => a[key] - b[key]);
      const cut = Math.floor(sorted.length / 3);
      const low = sorted.slice(0, cut);
      const high = sorted.slice(sorted.length - cut);

      const hiAvg = avgRating(high);
      const loAvg = avgRating(low);
      if (hiAvg == null || loAvg == null) continue;

      labels.push(label);
      highAvgs.push(parseFloat(hiAvg.toFixed(2)));
      lowAvgs.push(parseFloat(loAvg.toFixed(2)));

      const delta = Math.abs(hiAvg - loAvg);
      if (delta > bestDelta) { bestDelta = delta; best = { label, hiAvg, loAvg }; }
    }

    return { labels, highAvgs, lowAvgs, bestFeature: best };
  }, [data]);

  if (!labels.length) return null;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'High (top third)',
        data: highAvgs,
        backgroundColor: 'rgba(80,200,120,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Low (bottom third)',
        data: lowAvgs,
        backgroundColor: 'rgba(255,107,107,0.6)',
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: GR.tick, font: { size: 11 }, boxWidth: 12, padding: 14 },
      },
      tooltip: {
        backgroundColor: '#0c1a2e',
        borderColor: 'rgba(93,155,224,0.3)',
        borderWidth: 1,
        bodyColor: GR.tick,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.raw}/10`,
        },
      },
    },
    scales: {
      x: {
        min: 3,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
        title: { display: true, text: 'Avg Rating', color: GR.label, font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: GR.tick, font: { size: 11 } },
      },
    },
  };

  const bestDir = bestFeature
    ? bestFeature.hiAvg > bestFeature.loAvg ? 'higher' : 'lower'
    : null;

  return (
    <Panel id="audio-feature-ratings-panel" span={6}>
      <PanelHeader title="Audio Features vs Your Rating" note="Avg rating for tracks at the high vs low end of each feature" />
      {bestFeature && bestDir && (
        <p className="panel-insight">
          <strong>{bestFeature.label}</strong> is your strongest audio predictor — tracks high in it avg{' '}
          {bestFeature.hiAvg.toFixed(1)} vs {bestFeature.loAvg.toFixed(1)} for low ones. You lean {bestDir} {bestFeature.label.toLowerCase()}.
        </p>
      )}
      <div className="chart-shell" style={{ height: 280 }}>
        <Bar data={chartData} options={options} />
      </div>
    </Panel>
  );
}
