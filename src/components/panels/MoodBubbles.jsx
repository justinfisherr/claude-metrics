import { useMemo } from 'react';
import { Bubble } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import moodAxes from '../../../mood-axes.json';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip);

function ratingToColor(r, alpha = 0.8) {
  if (r >= 8) return `rgba(80,200,120,${alpha})`;
  if (r >= 6.5) return `rgba(74,158,255,${alpha})`;
  if (r >= 5) return `rgba(255,193,68,${alpha})`;
  return `rgba(255,107,107,${alpha})`;
}

export default function MoodBubbles({ data }) {
  const bubbles = useMemo(() => {
    const ps = data?.predictions || [];
    const moodStats = {};
    for (const p of ps) {
      for (const m of (p.moods || [])) {
        if (!moodAxes[m]) continue;
        if (!moodStats[m]) moodStats[m] = { count: 0, ratingSum: 0 };
        moodStats[m].count++;
        moodStats[m].ratingSum += p.actual;
      }
    }
    const maxCount = Math.max(...Object.values(moodStats).map(s => s.count), 1);
    return Object.entries(moodStats)
      .filter(([, s]) => s.count >= 1)
      .map(([mood, s]) => ({
        mood,
        x: moodAxes[mood].valence,
        y: moodAxes[mood].arousal,
        r: 4 + (s.count / maxCount) * 18,
        count: s.count,
        avgRating: s.ratingSum / s.count,
      }));
  }, [data]);

  if (!bubbles.length) return null;

  const topByRating = [...bubbles].filter(b => b.count >= 2).sort((a, b) => b.avgRating - a.avgRating)[0];
  const topByCount = [...bubbles].sort((a, b) => b.count - a.count)[0];

  const chartData = {
    datasets: [{
      label: 'Moods',
      data: bubbles.map(b => ({ x: b.x, y: b.y, r: b.r, mood: b.mood, count: b.count, avgRating: b.avgRating })),
      backgroundColor: bubbles.map(b => ratingToColor(b.avgRating, 0.72)),
      borderColor: bubbles.map(b => ratingToColor(b.avgRating, 0.95)),
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c1a2e',
        borderColor: 'rgba(93,155,224,0.3)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#fff',
        bodyColor: GR.tick,
        callbacks: {
          title: items => items[0].raw.mood,
          label: item => {
            const { count, avgRating } = item.raw;
            return [`${count} track${count !== 1 ? 's' : ''} tagged`, `Avg rating: ${avgRating.toFixed(1)}/10`];
          },
        },
      },
    },
    scales: {
      x: {
        min: -1, max: 1,
        title: { display: true, text: 'Valence  (dark ← → bright)', color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
      y: {
        min: -1, max: 1,
        title: { display: true, text: 'Arousal  (calm ← → intense)', color: GR.label, font: { weight: 800, size: 11 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
    },
  };

  return (
    <Panel id="mood-bubbles-panel" span={6}>
      <PanelHeader title="Mood Vocabulary Map" note="Your mood tags in VAD space — bubble size = usage, color = avg rating" />
      {topByRating && topByCount && (
        <p className="panel-insight">
          <strong>{topByRating.mood}</strong> is your highest-rated mood tag (avg {topByRating.avgRating.toFixed(1)}). You reach for <strong>{topByCount.mood}</strong> most often ({topByCount.count}×). Hover any bubble to explore.
        </p>
      )}
      <div className="chart-shell" style={{ height: 320 }}>
        <Bubble data={chartData} options={options} />
      </div>
    </Panel>
  );
}
