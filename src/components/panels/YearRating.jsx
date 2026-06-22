import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function YearRating({ data }) {
  if (!data) return null;
  const predictions = (data.predictions || []).filter(p => p.year);

  if (!predictions.length) return null;

  const chartData = {
    datasets: [{
      label: 'Tracks',
      data: predictions.map(p => ({ x: p.year, y: p.actual, title: p.title, artist: p.artist, era: p.era })),
      backgroundColor: predictions.map(p => colorFor(p.cluster)),
      borderColor: predictions.map(p => colorFor(p.cluster)),
      pointRadius: 5,
      pointHoverRadius: 8,
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
          label: c => `${c.raw.title} — ${c.raw.artist} (${c.raw.x}) · ${c.raw.y}/10`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Year', color: GR.label, font: { weight: 800 } },
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

  const yearInsight = (() => {
    if (predictions.length < 5) return null;
    // Group by decade
    const decades = {};
    predictions.forEach(p => {
      const dec = Math.floor(p.year / 10) * 10;
      if (!decades[dec]) decades[dec] = [];
      decades[dec].push(p.actual);
    });
    const decAvgs = Object.entries(decades)
      .filter(([, vals]) => vals.length >= 2)
      .map(([dec, vals]) => ({
        decade: dec + 's',
        avg: (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1),
        count: vals.length,
      }))
      .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
    if (!decAvgs.length) return null;
    const peak = decAvgs[0];
    // Find sweet spot range (decades averaging 7+)
    const sweetSpot = decAvgs.filter(d => parseFloat(d.avg) >= 7).map(d => d.decade);
    const range = sweetSpot.length > 1
      ? `${sweetSpot[sweetSpot.length - 1]}–${sweetSpot[0]}`
      : sweetSpot.length === 1 ? sweetSpot[0] : peak.decade;
    return { range, peak };
  })();

  return (
    <Panel id="year-rating-panel" span={6}>
      <PanelHeader title="Year vs Rating" note="Where in jazz history your taste lives" />
      {yearInsight && (
        <p className="panel-insight">
          Your sweet spot is the {yearInsight.range}. Tracks from the {yearInsight.peak.decade} average {yearInsight.peak.avg}.{' '}
          {parseFloat(yearInsight.peak.avg) >= 8
            ? 'That decade clearly speaks your language — the arranging, the feel, the production all click.'
            : 'You connect with that era more than others, though your taste stretches wider than any single decade.'}
        </p>
      )}
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = year of recording. <strong>Y axis</strong> = your rating. <strong>Color</strong> = cluster. Shows exactly which era of jazz history your highest ratings cluster in — and where you've barely explored. Hover any dot for the title, artist, and year.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={options} />
      </div>
    </Panel>
  );
}
