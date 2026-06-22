import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export default function MoodPolarity({ data }) {
  const ps = data?.predictions || [];

  const hidden = useMemo(() => {
    return !ps.length || ps[0].mood_polarity === undefined;
  }, [ps]);

  const chartData = useMemo(() => {
    if (hidden) return null;
    return {
      datasets: [{
        data: ps.map(p => ({ x: p.mood_polarity, y: p.actual, title: p.title, artist: p.artist })),
        backgroundColor: ps.map(p => p.liked ? '#50c878' : '#ff6b6b'),
        pointRadius: 5,
      }],
    };
  }, [ps, hidden]);

  const polarityInsight = useMemo(() => {
    if (hidden) return null;
    const highPol = ps.filter(p => p.mood_polarity >= 2);
    const lowPol = ps.filter(p => p.mood_polarity <= -1);
    if (!highPol.length || !lowPol.length) return null;
    const highAvg = (highPol.reduce((s, p) => s + p.actual, 0) / highPol.length).toFixed(1);
    const lowAvg = (lowPol.reduce((s, p) => s + p.actual, 0) / lowPol.length).toFixed(1);
    const diff = parseFloat(highAvg) - parseFloat(lowAvg);
    const interp = diff > 1
      ? 'You gravitate toward emotionally bright tracks, but the darker side still has a place in your listening.'
      : diff < -1
        ? 'Darker emotional territory resonates more — tension and complexity pull you in.'
        : 'Your taste spans the full emotional spectrum without strong preference.';
    return { highAvg, lowAvg, interp };
  }, [ps, hidden]);

  if (!data || hidden) return null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.raw.title} — ${ctx.raw.artist} (${ctx.raw.y}/10, polarity: ${ctx.raw.x})`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Mood Polarity', color: GR.label, font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
      y: {
        title: { display: true, text: 'Rating', color: GR.label, font: { weight: 800 } },
        min: 1,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
    },
  };

  return (
    <Panel id="polarity-panel" span={6}>
      <PanelHeader title="Mood Polarity vs Rating" note="Net positive minus negative mood count" />
      {polarityInsight && (
        <p className="panel-insight">
          Tracks with strongly positive mood polarity average {polarityInsight.highAvg}, while negative-polarity tracks average {polarityInsight.lowAvg}. {polarityInsight.interp}
        </p>
      )}
      <div className="chart-shell">
        <Scatter data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
