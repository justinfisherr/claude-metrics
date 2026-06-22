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

  const ensembleInsight = useMemo(() => {
    const predictions = (data?.predictions || []).filter(p => p.ensemble_size > 0);
    if (predictions.length < 5) return null;
    // Group by ensemble size
    const groups = {};
    predictions.forEach(p => {
      const sz = p.ensemble_size;
      if (!groups[sz]) groups[sz] = [];
      groups[sz].push(p.actual);
    });
    const sizeAvgs = Object.entries(groups)
      .filter(([, vals]) => vals.length >= 2)
      .map(([sz, vals]) => ({
        size: parseInt(sz),
        avg: (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1),
        count: vals.length,
      }))
      .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
    if (!sizeAvgs.length) return null;
    const best = sizeAvgs[0];
    return best;
  }, [data]);

  return (
    <Panel id="ensemble-panel" span={6}>
      <PanelHeader title="Ensemble Size vs Rating" note="Do you prefer small groups or large ensembles?" />
      {ensembleInsight && (
        <p className="panel-insight">
          Your sweet spot ensemble size is {ensembleInsight.size} players (avg {ensembleInsight.avg}).{' '}
          {ensembleInsight.size <= 4
            ? 'You connect most with intimate combos where every voice matters and the interplay is tight.'
            : ensembleInsight.size <= 7
            ? 'Mid-sized groups hit your ear right — enough texture for color without drowning the soloists.'
            : 'You gravitate toward bigger ensembles — the orchestral sweep and layered arrangements draw you in.'}
        </p>
      )}
      <div className="chart-shell">
        <Scatter data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
