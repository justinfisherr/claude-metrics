import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

const CLUSTER_COLORS_FULL = [
  'rgba(74, 158, 255, 0.86)',
  'rgba(255, 107, 107, 0.86)',
  'rgba(80, 200, 120, 0.86)',
  'rgba(255, 193, 68, 0.86)',
  'rgba(178, 117, 255, 0.86)',
  'rgba(75, 220, 225, 0.86)',
];

function colorFor(index) {
  return CLUSTER_COLORS_FULL[index % CLUSTER_COLORS_FULL.length];
}

function profilesFrom(data) {
  const raw = data?.clusters?.cluster_profiles || [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

export default function RatingDistribution({ data }) {
  if (!data) return null;

  const bins = data?.distributions?.ratings?.bins || [];
  const profiles = profilesFrom(data);
  const byCluster = data?.distributions?.ratings_by_cluster || [];
  if (!bins.length) return null;

  const chartData = {
    labels: bins.map(bin => String(bin)),
    datasets: byCluster.map((cluster, index) => ({
      label: profiles[index]?.top_moods?.[0] || `Cluster ${cluster.cluster + 1}`,
      data: bins.map(bin => (cluster.ratings || []).filter(rating => rating === bin).length),
      backgroundColor: colorFor(index),
      borderRadius: 7,
      borderSkipped: false,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#d7e6f7', boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 11, weight: 650 } },
      },
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
        stacked: true,
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
      y: {
        stacked: true,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, precision: 0, stepSize: 1 },
      },
    },
  };

  return (
    <Panel id="distribution-panel" span={6}>
      <PanelHeader title="Rating Distribution" note="Ratings split by cluster" />
      <p className="panel-desc">
        A stacked bar chart showing how many tracks you rated at each score level (2&ndash;10). <strong>Color</strong> = cluster. Reading the full bar height tells you how many tracks earned each score total; reading each color segment tells you which cluster those tracks belong to. Reveals whether you rate generously or strictly overall, and whether certain clusters consistently land at higher or lower scores than others.
      </p>
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
