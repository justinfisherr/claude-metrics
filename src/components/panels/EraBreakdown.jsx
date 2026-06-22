import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function EraBreakdown({ data }) {
  if (!data) return null;
  const predictions = data.predictions || [];

  const sorted = useMemo(() => {
    const groups = {};
    predictions.forEach(p => {
      if (!p.era || p.era === 'Unknown') return;
      groups[p.era] = groups[p.era] || [];
      groups[p.era].push(p.actual);
    });

    return Object.entries(groups)
      .map(([era, ratings]) => ({
        era,
        avg: ratings.reduce((s, r) => s + r, 0) / ratings.length,
        count: ratings.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [predictions]);

  if (!sorted.length) return null;

  const chartData = {
    labels: sorted.map(s => s.era),
    datasets: [{
      label: 'Avg Rating',
      data: sorted.map(s => Math.round(s.avg * 100) / 100),
      backgroundColor: sorted.map((_, i) => colorFor(i)),
      borderColor: sorted.map((_, i) => colorFor(i)),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
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
          label: c => {
            const item = sorted[c.dataIndex];
            return `Avg: ${c.raw}/10 · ${item.count} track${item.count !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 11, weight: 650 } },
      },
    },
  };

  return (
    <Panel id="era-panel" span={6}>
      <PanelHeader title="Era Breakdown" note="Average rating by jazz era" />
      <p className="panel-desc">
        Average rating grouped by musical <strong>era</strong> — Bebop, Hard Bop, Cool Jazz, Modal, Post-Bop, Swing. Bar intensity reflects average score; track count is shown per bar. Shows where in jazz history your taste lives and which eras you've barely explored. Modal and Hard Bop dominate your dataset; this shows whether that preference actually maps to higher scores.
      </p>
      <div className="chart-shell tall">
        <Bar data={chartData} options={options} />
      </div>
    </Panel>
  );
}
