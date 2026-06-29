import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR, CLUSTER_COLORS } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

const CLUSTER_BG = [
  'rgba(74, 158, 255, 0.13)',
  'rgba(255, 107, 107, 0.13)',
  'rgba(80, 200, 120, 0.13)',
  'rgba(255, 193, 68, 0.13)',
  'rgba(178, 117, 255, 0.13)',
  'rgba(75, 220, 225, 0.13)',
];

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

export default function ClusterScatter({ data }) {
  if (!data) return null;

  const profiles = profilesFrom(data);
  const clusterCount = data?.clusters?.best_k ?? profiles.length;
  const predictions = data?.predictions || [];

  const datasets = [];
  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const points = predictions.filter(p => p.cluster === cluster);
    const profile = profiles[cluster] || {};
    const label = profile.label || `Cluster ${cluster}`;

    datasets.push({
      label,
      data: points.map(p => ({
        x: p.pca_x,
        y: p.pca_y,
        title: p.title,
        artist: p.artist,
        rating: p.actual,
      })),
      backgroundColor: colorFor(cluster),
      borderColor: colorFor(cluster),
      pointRadius: points.map(p => Math.max(5, 3 + Number(p.actual || 0) * 0.65)),
      pointHoverRadius: 9,
    });
  }

  const chartData = { datasets };

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
        callbacks: {
          label: (context) => {
            const point = context.raw;
            return `${point.title || 'Untitled'} — ${point.artist || 'Unknown'} (${point.rating ?? '—'}/10)`;
          },
        },
      },
    },
    scales: {
      x: { grid: { color: GR.grid }, ticks: { display: false } },
      y: { grid: { color: GR.grid }, ticks: { display: false } },
    },
  };

  return (
    <Panel id="clusters-panel" span={6}>
      <PanelHeader title="Taste Clusters" note="Tracks grouped by similarity" />
      {(() => {
        const descs = profiles.map((p) => p.label || `Cluster`).join(', ');
        return (
          <p className="panel-insight">
            Your taste splits into {clusterCount} distinct zones: {descs}. Tracks near the center of the map share qualities of multiple clusters.
          </p>
        );
      })()}
      <p className="panel-desc">
        Your tracks are grouped using <strong>K-Means clustering</strong> on PCA-reduced features. <strong>PCA</strong> (Principal Component Analysis) compresses all musical features into two dimensions — tracks close together share similar audio and mood profiles. <strong>Dot size</strong> scales with your rating: bigger = higher score. <strong>Color</strong> = cluster membership. The cluster labels shown in the legend and summary cards are the most common moods in that group. Hover any dot for the track title, artist, and rating.
      </p>
      <div className="chart-shell tall">
        <Scatter data={chartData} options={chartOptions} />
      </div>
      <div className="cluster-summary">
        {profiles.map((profile, index) => (
          <div
            key={index}
            className="cluster-tag"
            style={{ borderLeftColor: colorFor(index) }}
          >
            <div className="name">
              {profile.label || `Cluster ${index}`}
            </div>
            <div className="info">
              {profile.size ?? '—'} tracks &middot; avg {profile.mean_rating ?? '—'}/10 &middot; energy {profile.mean_energy ?? '—'}
            </div>
            <div className="info">
              {profile.representative_tracks?.slice(0, 2).join(', ') || ''}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
