import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function InstrumentCombos({ data }) {
  const { filtered, labels, avgs, colors, empty } = useMemo(() => {
    const ps = data?.predictions || [];
    if (!ps.length) return { filtered: [], labels: [], avgs: [], colors: [], empty: true };

    const combos = {};
    ps.forEach(p => {
      const parts = [];
      if (p.primary_instrument) parts.push(p.primary_instrument);
      if (p.has_vocals) parts.push('vocals');
      if (p.has_guitar) parts.push('guitar');
      if (p.is_pianoless === 0 && p.primary_instrument !== 'piano') parts.push('piano');
      parts.sort();
      const key = parts.join(' + ');
      if (!combos[key]) combos[key] = { sum: 0, n: 0, liked: 0 };
      combos[key].sum += p.actual;
      combos[key].n++;
      if (p.liked) combos[key].liked++;
    });

    const f = Object.entries(combos)
      .filter(([, v]) => v.n >= 2)
      .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n));

    if (!f.length) return { filtered: f, labels: [], avgs: [], colors: [], empty: true };

    return {
      filtered: f,
      labels: f.map(e => `${e[0]} (${e[1].n})`),
      avgs: f.map(e => +(e[1].sum / e[1].n).toFixed(2)),
      colors: f.map(e => e[1].liked / e[1].n > 0.5 ? '#50c878' : '#ff6b6b'),
      empty: false,
    };
  }, [data]);

  if (!data || empty) return null;

  const chartData = {
    labels,
    datasets: [{
      data: avgs,
      backgroundColor: colors,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `avg ${ctx.raw}/10`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 10,
        title: { display: true, text: 'Average Rating', color: GR.label, font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
      y: {
        grid: { display: false },
        ticks: { color: GR.tick, font: { size: 10 } },
      },
    },
  };

  return (
    <Panel id="instrument-combos-panel" span={12}>
      <PanelHeader title="Instrument Combinations" note="Which instrument pairings rate highest" />
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
