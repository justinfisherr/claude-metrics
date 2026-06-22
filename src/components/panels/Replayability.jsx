import { Scatter, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function Replayability({ data }) {
  if (!data) return null;
  const predictions = data.predictions || [];
  const pts = predictions.filter(p => p.replayability != null && typeof p.replayability === 'number');

  if (!pts.length) {
    return (
      <Panel id="replayability-panel" span={6}>
        <PanelHeader title="Replayability vs Rating" note="Average rating grouped by how often you'd replay a track" />
        <div className="empty-state">No replayability data yet.</div>
      </Panel>
    );
  }

  const chartData = {
    datasets: [
      {
        label: 'Tracks',
        data: pts.map(p => ({ x: p.replayability, y: p.actual, title: p.title, artist: p.artist })),
        backgroundColor: pts.map(p => colorFor(p.cluster)),
        borderColor: pts.map(p => colorFor(p.cluster)),
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Diagonal',
        data: [{ x: 1, y: 1 }, { x: 10, y: 10 }],
        type: 'line',
        borderColor: 'rgba(255,255,255,0.12)',
        borderDash: [6, 4],
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
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
        filter: c => c.datasetIndex === 0,
        callbacks: {
          label: c => `${c.raw.title} — ${c.raw.artist} · Rating: ${c.raw.y}/10 · Replay: ${c.raw.x}/10`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Replayability', color: GR.label, font: { weight: 800 } },
        min: 0,
        max: 11,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
      y: {
        title: { display: true, text: 'Your Rating', color: GR.label, font: { weight: 800 } },
        min: 0,
        max: 11,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
    },
  };

  const highReplay = pts.filter(p => p.replayability >= 8);
  const highReplayAvg = highReplay.length
    ? (highReplay.reduce((s, p) => s + p.actual, 0) / highReplay.length).toFixed(1)
    : null;
  const correlation = pts.length >= 5
    ? (() => {
        const n = pts.length;
        const sx = pts.reduce((s, p) => s + p.replayability, 0);
        const sy = pts.reduce((s, p) => s + p.actual, 0);
        const sxy = pts.reduce((s, p) => s + p.replayability * p.actual, 0);
        const sx2 = pts.reduce((s, p) => s + p.replayability ** 2, 0);
        const sy2 = pts.reduce((s, p) => s + p.actual ** 2, 0);
        const denom = Math.sqrt((n * sx2 - sx ** 2) * (n * sy2 - sy ** 2));
        return denom ? (n * sxy - sx * sy) / denom : 0;
      })()
    : null;

  return (
    <Panel id="replayability-panel" span={6}>
      <PanelHeader title="Replayability vs Rating" note="Average rating grouped by how often you'd replay a track" />
      {highReplayAvg && (
        <p className="panel-insight">
          Tracks with replayability 8+ average {highReplayAvg} in your ratings.{' '}
          {correlation !== null && correlation > 0.7
            ? 'Replayability is the strongest predictor of your ratings — when you want to hear it again, you almost always rated it highly.'
            : correlation !== null && correlation > 0.4
            ? 'There\'s a solid link between replay value and your ratings, though some one-listen masterpieces break the pattern.'
            : 'Interestingly, replay value and ratings don\'t always line up — you appreciate tracks you wouldn\'t necessarily revisit.'}
        </p>
      )}
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = replayability (1–10). <strong>Y axis</strong> = your rating. Tracks on the diagonal line are perfectly aligned — you rate them as much as you'd replay them. <strong>Above the line</strong> = one-listen masterpieces (rated high, wouldn't replay). <strong>Below the line</strong> = guilty pleasures (replay more than the rating suggests). Hover any dot for the title.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
