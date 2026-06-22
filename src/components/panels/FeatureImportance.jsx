import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

export default function FeatureImportance({ data }) {
  if (!data) return null;

  const features = (data?.feature_importance || []).slice(0, 12).reverse();
  if (!features.length) return null;

  const chartData = {
    labels: features.map(item => item.feature),
    datasets: [{
      label: 'Importance',
      data: features.map(item => item.importance),
      backgroundColor: features.map(item =>
        item.direction === 'positive' ? 'rgba(80, 200, 120, 0.62)' : 'rgba(255, 107, 107, 0.62)'
      ),
      borderColor: features.map(item =>
        item.direction === 'positive' ? 'rgba(80, 200, 120, 0.95)' : 'rgba(255, 107, 107, 0.95)'
      ),
      borderWidth: 1,
      borderRadius: 7,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    indexAxis: 'y',
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
        bodyColor: '#d7e6f7',
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { color: GR.grid },
        ticks: { color: GR.tick, font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#d7e6f7',
          font: { size: 11, weight: 650 },
        },
      },
    },
  };

  return (
    <Panel id="importance-panel" span={6}>
      <PanelHeader title="Feature Importance" note="Most influential model features" />
      {(() => {
        const sorted = [...(data?.feature_importance || [])].sort((a, b) => b.importance - a.importance);
        if (!sorted.length) return null;
        const top3 = sorted.slice(0, 3);
        const fmt = f => f.feature.replace(/_/g, ' ').replace(/^(era|mood|inst|subgenre) /, '$1: ');
        const dirWord = f => f.direction === 'positive' ? 'boosts' : 'lowers';
        return (
          <p className="panel-insight">
            The strongest predictor of whether you'll love a track is <strong>{fmt(top3[0])}</strong>.{' '}
            {top3.slice(1).map(f => `${fmt(f)} ${dirWord(f)} your expected score`).join(', and ')}.
          </p>
        );
      })()}
      <p className="panel-desc">
        Shows which input variables drive the model's predictions most. <strong>Green bars</strong> = feature pushes predicted rating up. <strong>Red bars</strong> = pushes it down. Importance is normalized 0&ndash;1 relative to the top feature. Key feature families: <code>era_*</code> (musical era like Modal or Hard Bop), <code>mood_*</code> (tagged mood like romantic or bluesy), <code>inst_*</code> (primary instrument group), <code>subgenre_*</code> (tagged subgenre), <code>artist_mean_rating</code> (your average rating for other tracks by the same artist), <code>energy</code> (1&ndash;10 scale), <code>tempo</code> (slow&rarr;fast mapped 1&ndash;4), <code>harmonic_complexity</code> (low/med/high &rarr; 1&ndash;3), and <code>replayability</code> (1&ndash;10 scale).
      </p>
      <div className="chart-shell tall">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
