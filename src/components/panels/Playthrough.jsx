import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function Playthrough({ data }) {
  if (!data) return null;
  const predictions = data.predictions || [];
  const pts = predictions.filter(p => p.playthrough != null);

  if (!pts.length) {
    return (
      <Panel id="playthrough-panel" span={6}>
        <PanelHeader title="Playthrough vs Rating" note="How far you get before skipping" />
        <div className="empty-state">No playthrough data yet.</div>
      </Panel>
    );
  }

  const chartData = {
    datasets: [{
      label: 'Tracks',
      data: pts.map(p => ({ x: Math.round(p.playthrough * 100), y: p.actual, title: p.title, artist: p.artist })),
      backgroundColor: pts.map(p => colorFor(p.cluster)),
      borderColor: pts.map(p => colorFor(p.cluster)),
      pointRadius: 5,
      pointHoverRadius: 8,
    }],
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
        callbacks: {
          label: c => `${c.raw.title} — ${c.raw.artist} · Rating: ${c.raw.y}/10 · Listened: ${c.raw.x}%`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Playthrough %', color: GR.label, font: { weight: 800 } },
        min: 0,
        max: 105,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, callback: v => v + '%' },
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

  return (
    <Panel id="playthrough-panel" span={6}>
      <PanelHeader title="Playthrough vs Rating" note="How far you get before skipping" />
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = how much of the track you listened to (0–100%). <strong>Y axis</strong> = your rating. Tracks in the <strong>top-right</strong> = loved and listened fully. <strong>Bottom-left</strong> = bailed early and rated low. <strong>Top-left</strong> = rated well but didn't finish (rare). <strong>Bottom-right</strong> = sat through it but didn't like it. Hover for title.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
