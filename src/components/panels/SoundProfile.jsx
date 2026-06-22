import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PAIRS = [
  { label: 'Has Piano', filter: p => !p.is_pianoless },
  { label: 'No Piano', filter: p => !!p.is_pianoless },
  { label: 'Has Vocals', filter: p => !!p.has_vocals },
  { label: 'Instrumental', filter: p => !p.has_vocals },
  { label: 'Has Guitar', filter: p => !!p.has_guitar },
  { label: 'No Guitar', filter: p => !p.has_guitar },
];

const COLORS = [
  'rgba(74,158,255,0.65)', 'rgba(74,158,255,0.3)',
  'rgba(80,200,120,0.65)', 'rgba(80,200,120,0.3)',
  'rgba(255,193,68,0.65)', 'rgba(255,193,68,0.3)',
];

export default function SoundProfile({ data }) {
  const { avgs, counts } = useMemo(() => {
    const predictions = data?.predictions || [];
    if (!predictions.length) return { avgs: [], counts: [] };

    const a = PAIRS.map(({ filter }) => {
      const group = predictions.filter(filter);
      return group.length
        ? Math.round(group.reduce((s, p) => s + p.actual, 0) / group.length * 100) / 100
        : null;
    });
    const c = PAIRS.map(({ filter }) => predictions.filter(filter).length);

    return { avgs: a, counts: c };
  }, [data]);

  if (!data || !avgs.length) return null;

  const chartData = {
    labels: PAIRS.map(p => p.label),
    datasets: [{
      label: 'Avg Rating',
      data: avgs,
      backgroundColor: COLORS,
      borderColor: COLORS.map(c => c.replace(/[\d.]+\)$/, '1)')),
      borderWidth: 1.5,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: c => {
            const i = c.dataIndex;
            return `Avg: ${c.raw}/10 · ${counts[i]} track${counts[i] !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: GR.tick, font: { size: 11, weight: 700 } } },
      y: { min: 0, max: 10, grid: { color: GR.grid }, ticks: { color: GR.tick, stepSize: 2 } },
    },
  };

  return (
    <Panel id="sound-panel" span={6}>
      <PanelHeader title="Sound Profile" note="Average rating by instrumentation features" />
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
