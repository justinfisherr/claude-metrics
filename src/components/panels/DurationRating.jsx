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

  const durationInsight = (() => {
    if (predictions.length < 5) return null;
    const highRated = predictions.filter(p => p.actual >= 7);
    if (!highRated.length) return null;
    const avgDur = (highRated.reduce((s, p) => s + p.duration_s, 0) / highRated.length / 60).toFixed(1);
    const threshold = 8; // minutes
    const longTracks = predictions.filter(p => p.duration_s / 60 >= threshold);
    const longAvg = longTracks.length
      ? (longTracks.reduce((s, p) => s + p.actual, 0) / longTracks.length).toFixed(1)
      : null;
    const overallAvg = (predictions.reduce((s, p) => s + p.actual, 0) / predictions.length).toFixed(1);
    return { avgDur, longAvg, threshold, overallAvg, longCount: longTracks.length };
  })();

  return (
    <Panel id="duration-rating-panel" span={6}>
      <PanelHeader title="Duration vs Rating" note="Does track length affect your score?" />
      {durationInsight && (
        <p className="panel-insight">
          Your highest-rated tracks average {durationInsight.avgDur} minutes.{' '}
          {durationInsight.longAvg && durationInsight.longCount >= 2
            ? `Tracks over ${durationInsight.threshold} minutes average ${durationInsight.longAvg} — ${
                parseFloat(durationInsight.longAvg) >= parseFloat(durationInsight.overallAvg)
                  ? 'you have patience for long-form jazz when the playing warrants it.'
                  : 'extended jams tend to lose you, suggesting you prefer tighter arrangements.'
              }`
            : 'Not enough long tracks yet to read your pacing sensitivity.'}
        </p>
      )}
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = track length in minutes (from <code>audio_features.duration_s</code>). <strong>Y axis</strong> = your rating. <strong>Color</strong> = cluster. Reveals your pacing sensitivity — whether longer tracks tend to get docked, and what your sweet spot for runtime is. Only tracks with a logged duration are shown.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
