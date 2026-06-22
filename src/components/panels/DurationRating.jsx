import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function DurationRating({ data }) {
  if (!data) return null;
  const predictions = (data.predictions || []).filter(p => p.duration_s);

  if (!predictions.length) return null;

  const chartData = {
    datasets: [{
      label: 'Tracks',
      data: predictions.map(p => ({
        x: Math.round(p.duration_s / 60 * 10) / 10,
        y: p.actual,
        title: p.title,
        artist: p.artist,
      })),
      backgroundColor: predictions.map(p => colorFor(p.cluster)),
      borderColor: predictions.map(p => colorFor(p.cluster)),
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
          label: c => `${c.raw.title} — ${c.raw.artist} · ${c.raw.x} min · ${c.raw.y}/10`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Duration (minutes)', color: GR.label, font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        title: { display: true, text: 'Your Rating', color: GR.label, font: { weight: 800 } },
        min: 1,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
    },
  };

  return (
    <Panel id="duration-rating-panel" span={6}>
      <PanelHeader title="Duration vs Rating" note="Does track length affect your score?" />
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = track length in minutes (from <code>audio_features.duration_s</code>). <strong>Y axis</strong> = your rating. <strong>Color</strong> = cluster. Reveals your pacing sensitivity — whether longer tracks tend to get docked, and what your sweet spot for runtime is. Only tracks with a logged duration are shown.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
