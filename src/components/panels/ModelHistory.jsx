import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const SPEARMAN_COLOR = 'rgba(80, 200, 120, 0.95)';

export default function ModelHistory({ data }) {
  const honestRuns = useMemo(
    () => (data?.history || []).filter(run => run.unseen_album_spearman != null),
    [data]
  );

  if (!data?.history || honestRuns.length < 2) return null;

  const labels = honestRuns.map((run, i) => `#${i + 1} · ${run.dataset_size}`);
  const scores = honestRuns.map(run => Number(run.unseen_album_spearman));
  const latest = scores[scores.length - 1];
  const best = Math.max(...scores);
  const yMax = Math.max(0.35, Math.ceil(best * 10) / 10 + 0.05);

  const chartData = {
    labels,
    datasets: [{
      label: 'Unseen-album Spearman',
      data: scores,
      borderColor: SPEARMAN_COLOR,
      backgroundColor: 'rgba(80, 200, 120, 0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: SPEARMAN_COLOR,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f1f38',
        borderColor: 'rgba(93, 155, 224, 0.26)',
        borderWidth: 1,
        padding: 10,
        titleColor: '#fff',
        bodyColor: '#d7e6f7',
        callbacks: {
          title: items => {
            const run = honestRuns[items[0].dataIndex];
            return `${run.dataset_size} tracks · ${run.run_date}`;
          },
          label: c => `Spearman ${Number(c.raw).toFixed(3)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: GR.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        min: 0,
        max: yMax,
        title: { display: true, text: 'Spearman (unseen albums)', color: GR.label },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.05 },
      },
    },
  };

  return (
    <Panel id="history-panel" span={12}>
      <PanelHeader title="Model Over Time" note="Honest ranking metric as the dataset grows" />
      <p className="panel-insight">
        The model has been retrained {data.history.length} times, but only the last{' '}
        {honestRuns.length} runs have an honest unseen-album score. Latest Spearman{' '}
        <strong>{latest.toFixed(2)}</strong>; best so far <strong>{best.toFixed(2)}</strong>.
      </p>
      <p className="panel-desc">
        Each point is a run scored on whole albums held out of training, with every rating-derived
        average rebuilt without them. Runs before the album-grouped holdout reported an
        album-contaminated R&sup2; and are deliberately left off this chart — they are not
        comparable. Higher is better; 0 means no ranking signal, 1 means a perfect ordering.
      </p>
      <div className="chart-shell">
        <Line data={chartData} options={options} />
      </div>
    </Panel>
  );
}
