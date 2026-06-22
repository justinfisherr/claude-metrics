import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const SOURCES = ['self', 'claude-recommendation', 'autoplay'];
const LABELS = ['Self-found', 'Claude Pick', 'Autoplay'];
const BG_COLORS = ['rgba(74,158,255,0.65)', 'rgba(80,200,120,0.65)', 'rgba(255,193,68,0.65)'];
const BORDER_COLORS = ['rgba(74,158,255,1)', 'rgba(80,200,120,1)', 'rgba(255,193,68,1)'];

export default function DiscoverySource({ data }) {
  const { avgs, counts, empty } = useMemo(() => {
    const predictions = data?.predictions || [];
    const groups = {};
    SOURCES.forEach(s => { groups[s] = []; });

    predictions.forEach(p => {
      const src = p.discovered_from || 'self';
      if (groups[src]) groups[src].push(p.actual);
    });

    const c = SOURCES.map(s => groups[s].length);
    const a = SOURCES.map(s =>
      groups[s].length
        ? Math.round(groups[s].reduce((acc, r) => acc + r, 0) / groups[s].length * 100) / 100
        : null
    );

    return { avgs: a, counts: c, empty: c.every(v => v === 0) };
  }, [data]);

  if (!data) return null;

  if (empty) {
    return (
      <Panel id="discovery-panel" span={6}>
        <PanelHeader title="Discovery Source" note="Do Claude recommendations land better than self-finds?" />
        <div className="empty-state">No discovery source data yet.</div>
      </Panel>
    );
  }

  const chartData = {
    labels: LABELS,
    datasets: [{
      label: 'Avg Rating',
      data: avgs,
      backgroundColor: BG_COLORS,
      borderColor: BORDER_COLORS,
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
      x: { grid: { display: false }, ticks: { color: GR.tick, font: { weight: 700 } } },
      y: { min: 0, max: 10, grid: { color: GR.grid }, ticks: { color: GR.tick, stepSize: 2 } },
    },
  };

  return (
    <Panel id="discovery-panel" span={6}>
      <PanelHeader title="Discovery Source" note="Do Claude recommendations land better than self-finds?" />
      {avgs[0] != null && avgs[1] != null && (() => {
        const selfAvg = avgs[0];
        const claudeAvg = avgs[1];
        const diff = claudeAvg - selfAvg;
        const interp = diff > 0.5
          ? 'Claude picks are landing — the model knows your taste.'
          : diff < -0.5
            ? 'Your own discoveries outperform — trust your instincts.'
            : 'Self-finds and Claude picks are neck and neck.';
        return (
          <p className="panel-insight">
            Tracks you found yourself average {selfAvg.toFixed(1)}, vs Claude recommendations at {claudeAvg.toFixed(1)}. {interp}
          </p>
        );
      })()}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
