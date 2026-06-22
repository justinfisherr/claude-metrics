import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const LEVELS = ['low', 'medium', 'high'];
const LABELS = ['Low', 'Medium', 'High'];
const BG_COLORS = ['rgba(74,158,255,0.55)', 'rgba(178,117,255,0.55)', 'rgba(80,200,120,0.55)'];
const BORDER_COLORS = ['rgba(74,158,255,1)', 'rgba(178,117,255,1)', 'rgba(80,200,120,1)'];

export default function HarmonicComplexity({ data }) {
  const { avgs, counts, empty } = useMemo(() => {
    const predictions = data?.predictions || [];
    const groups = {};
    LEVELS.forEach(l => { groups[l] = []; });

    predictions.forEach(p => {
      const k = (p.harmonic_complexity || '').toLowerCase();
      if (groups[k]) groups[k].push(p.actual);
    });

    const c = LEVELS.map(l => groups[l].length);
    const a = LEVELS.map(l =>
      groups[l].length
        ? Math.round(groups[l].reduce((s, r) => s + r, 0) / groups[l].length * 100) / 100
        : null
    );

    return { avgs: a, counts: c, empty: c.every(v => v === 0) };
  }, [data]);

  if (!data) return null;

  if (empty) {
    return (
      <Panel id="harmonic-panel" span={6}>
        <PanelHeader title="Harmonic Complexity" note="Average rating by low / medium / high complexity" />
        <div className="empty-state">No harmonic complexity data yet.</div>
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

  const hcInsight = (() => {
    // Find the level with the highest average
    const validLevels = LEVELS.map((l, i) => ({ level: LABELS[i], avg: avgs[i], count: counts[i] }))
      .filter(l => l.avg !== null && l.count >= 2);
    if (!validLevels.length) return null;
    validLevels.sort((a, b) => b.avg - a.avg);
    const best = validLevels[0];
    return best;
  })();

  return (
    <Panel id="harmonic-panel" span={6}>
      <PanelHeader title="Harmonic Complexity" note="Average rating by low / medium / high complexity" />
      {hcInsight && (
        <p className="panel-insight">
          {hcInsight.level} harmonic complexity averages {hcInsight.avg}/10.{' '}
          {hcInsight.level === 'High'
            ? 'You reward dense chord changes and sophisticated voicings — the more harmonic information, the better.'
            : hcInsight.level === 'Low'
            ? 'Simpler harmony wins your ear — you prefer space and clarity over dense chord movement.'
            : 'You land in the middle ground — enough harmonic motion to stay interesting without overcomplicating the listen.'}
        </p>
      )}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
