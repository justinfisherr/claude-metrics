import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function EnsembleSize({ data }) {
  const { datasets, empty } = useMemo(() => {
    const predictions = (data?.predictions || []).filter(p => p.ensemble_size > 0);
    if (!predictions.length) return { datasets: [], empty: true };

    const k = data?.clusters?.best_k || 1;
    const ds = [];
    for (let c = 0; c < k; c++) {
      const pts = predictions.filter(p => p.cluster === c);
      const profiles = data?.clusters?.cluster_profiles || [];
      const label = profiles[c]?.top_moods?.slice(0, 2).join(', ') || `Cluster ${c + 1}`;
      ds.push({
        label,
        data: pts.map(p => ({ x: p.ensemble_size, y: p.actual, title: p.title, artist: p.artist })),
        backgroundColor: colorFor(c),
        borderColor: colorFor(c),
        pointRadius: 5,
        pointHoverRadius: 8,
      });
    }
    return { datasets: ds, empty: false };
  }, [data]);

  if (!data) return null;

  if (empty) {
    return (
      <Panel id="ensemble-panel" span={6}>
        <PanelHeader title="Ensemble Size vs Rating" note="Do you prefer small groups or large ensembles?" />
        <div className="empty-state">No instrumentation data yet.</div>
      </Panel>
    );
  }

  const chartData = { datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: c => `${c.raw.title} — ${c.raw.artist} · ${c.raw.x} instruments · ${c.raw.y}/10`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Ensemble Size (instruments)', color: GR.label, font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
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
    <Panel id="ensemble-panel" span={6}>
      <PanelHeader title="Ensemble Size vs Rating" note="Do you prefer small groups or large ensembles?" />
      <div className="chart-shell">
        <Scatter data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
