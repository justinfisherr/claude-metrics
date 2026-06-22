import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function TasteVsWorld({ data }) {
  if (!data) return null;
  const predictions = (data.predictions || []).filter(p => p.popularity != null);

  if (!predictions.length) return null;

  const chartData = {
    datasets: [{
      label: 'Tracks',
      data: predictions.map(p => ({ x: p.popularity, y: p.actual, title: p.title, artist: p.artist })),
      backgroundColor: predictions.map(p => {
        const diff = Math.abs(p.popularity / 100 - p.actual / 10);
        return diff > 0.35 ? 'rgba(255,193,68,0.72)' : 'rgba(74,158,255,0.65)';
      }),
      pointRadius: 5.5,
      pointHoverRadius: 9,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
            const p = c.raw;
            return `${p.title} — ${p.artist} | Pop: ${p.x}, You: ${p.y}/10`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Spotify Popularity', color: GR.label, font: { weight: 800 } },
        min: 0,
        max: 80,
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
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

  const tasteInsight = (() => {
    if (predictions.length < 5) return null;
    const favorites = predictions.filter(p => p.actual >= 7);
    if (!favorites.length) return null;
    const belowAvgPop = favorites.filter(p => p.popularity < 50);
    const pct = Math.round((belowAvgPop.length / favorites.length) * 100);
    const avgPop = Math.round(predictions.reduce((s, p) => s + p.popularity, 0) / predictions.length);
    const agrees = pct < 50;
    return { agrees, pct, avgPop };
  })();

  return (
    <Panel id="taste-world-panel" span={6}>
      <PanelHeader title="Your Taste vs The World" note="Spotify popularity vs your personal rating" />
      {tasteInsight && (
        <p className="panel-insight">
          Your taste {tasteInsight.agrees ? 'agrees with' : 'diverges from'} Spotify's crowd — {tasteInsight.pct}% of your favorites have below-average popularity.{' '}
          {tasteInsight.pct >= 70
            ? 'You\'re digging deep into the catalog where the real heads live.'
            : tasteInsight.pct >= 40
            ? 'You split the difference between deep cuts and well-known recordings.'
            : 'You gravitate toward the canon — the classics earned their reputation with you.'}
        </p>
      )}
      <p className="panel-desc">
        <strong>X axis</strong> = Spotify popularity score (0–100, from <code>audio_features.popularity</code>) — a crowd consensus measure based on recent streams. <strong>Y axis</strong> = your personal rating (1–10). <strong>Blue dots</strong> = you roughly agree with the mainstream. <strong>Yellow dots</strong> = significant divergence (your rating vs. popularity differ by more than 35% of their respective scales). Tracks in the <strong>top-left</strong> are hidden gems you love that the world undervalues. Tracks in the <strong>bottom-right</strong> are popular but didn't land for you. Only tracks with a Spotify popularity score are shown.
      </p>
      <div className="chart-shell tall">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
