import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { GR } from '../../utils/chartDefaults';
import { useDashboardData } from '../../hooks/useDashboardData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, annotationPlugin);

const RIDGE_COLOR = 'rgba(74, 158, 255, 0.92)';
const RF_COLOR    = 'rgba(255, 180, 50, 0.92)';
const BEST_COLOR  = 'rgba(80, 200, 120, 0.92)';
const RMSE_COLOR  = 'rgba(255, 107, 107, 0.92)';

function buildAnnotations(majorMarkers) {
  const annotations = {};
  majorMarkers.forEach((m, i) => {
    annotations[`major${i}`] = {
      type: 'line',
      xMin: m.index,
      xMax: m.index,
      borderColor: 'rgba(74, 158, 255, 0.5)',
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: m.name || `v${m.version}`,
        position: 'start',
        backgroundColor: 'rgba(74, 158, 255, 0.15)',
        color: 'var(--accent)',
        font: { size: 10, weight: 700 },
        padding: { top: 2, bottom: 2, left: 6, right: 6 },
        borderRadius: 4,
      },
    };
  });
  return annotations;
}

export default function ModelHistory({ data }) {
  const { manifest } = useDashboardData();

  const majorMarkers = useMemo(() => {
    if (!manifest || !data?.history) return [];
    const majors = manifest.versions.filter(v => v.is_major);
    return majors.map(v => {
      if (v.version === '1.00') return { index: 0, name: v.name || 'v1.00', version: v.version };
      const idx = data.history.findIndex(h =>
        h.dataset_size === v.dataset_size && Math.abs(h.r_squared - v.r_squared) < 0.01
      );
      return idx >= 0 ? { index: idx, name: v.name || `v${v.version}`, version: v.version } : null;
    }).filter(Boolean);
  }, [manifest, data]);

  if (!data?.history || data.history.length < 2) return null;

  const h = data.history;
  const labels = h.map(item => `${item.dataset_size} tracks`);
  const minWidth = Math.max(400, h.length * 50);
  const annotations = buildAnnotations(majorMarkers);

  // Best model chart
  const bestChartData = {
    labels,
    datasets: [
      {
        label: 'R² (best)',
        data: h.map(item => item.r_squared),
        borderColor: BEST_COLOR,
        backgroundColor: 'rgba(80, 200, 120, 0.12)',
        yAxisID: 'y',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: BEST_COLOR,
      },
      {
        label: 'RMSE (best)',
        data: h.map(item => item.rmse),
        borderColor: RMSE_COLOR,
        backgroundColor: 'rgba(255, 107, 107, 0.12)',
        yAxisID: 'y1',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: RMSE_COLOR,
      },
    ],
  };

  const bestChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
        callbacks: {
          afterTitle: (items) => {
            const idx = items[0]?.dataIndex;
            if (idx == null) return '';
            const entry = h[idx];
            const algo = entry.best_model === 'random_forest' ? 'Random Forest' : 'Ridge';
            return `algo: ${algo}`;
          },
        },
      },
      annotation: { annotations },
    },
    scales: {
      x: { grid: { color: GR.grid }, ticks: { color: GR.tick } },
      y: {
        position: 'left',
        title: { display: true, text: 'R²', color: 'rgba(80,200,120,0.9)', font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: 'rgba(80,200,120,0.8)' },
      },
      y1: {
        position: 'right',
        title: { display: true, text: 'RMSE', color: 'rgba(255,107,107,0.9)', font: { weight: 800 } },
        grid: { drawOnChartArea: false },
        ticks: { color: 'rgba(255,107,107,0.8)' },
      },
    },
  };

  // Per-model R² chart (only entries that have the per-model fields)
  const hasPerModel = h.some(item => item.ridge_r_squared != null);
  const perModelChartData = hasPerModel ? {
    labels,
    datasets: [
      {
        label: 'Ridge R²',
        data: h.map(item => item.ridge_r_squared ?? null),
        borderColor: RIDGE_COLOR,
        backgroundColor: 'rgba(74, 158, 255, 0.1)',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: RIDGE_COLOR,
        spanGaps: false,
      },
      {
        label: 'Random Forest R²',
        data: h.map(item => item.rf_r_squared ?? null),
        borderColor: RF_COLOR,
        backgroundColor: 'rgba(255, 180, 50, 0.1)',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: RF_COLOR,
        spanGaps: false,
      },
    ],
  } : null;

  const perModelOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
      },
      annotation: { annotations },
    },
    scales: {
      x: { grid: { color: GR.grid }, ticks: { color: GR.tick } },
      y: {
        title: { display: true, text: 'R²', color: '#d7e6f7', font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick },
      },
    },
  };

  const peak = h.reduce((best, cur) => cur.r_squared > best.r_squared ? cur : best, h[0]);
  const latest = h[h.length - 1];
  const trend = latest.r_squared >= peak.r_squared ? 'still climbing'
    : latest.r_squared >= peak.r_squared - 0.05 ? 'holding steady'
    : 'dipped since its peak';

  return (
    <Panel id="history-panel" span={12}>
      <PanelHeader title="Model Over Time" note="Performance as the dataset grows" />
      <p className="panel-insight">
        The model has been retrained {h.length} times. R² peaked at {peak.r_squared} with {peak.dataset_size} tracks — {trend}.
        {majorMarkers.length > 0 && ` Dashed blue lines mark major releases: ${majorMarkers.map(m => m.name).join(', ')}.`}
      </p>

      <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
        Best Model (hover shows algo)
      </p>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
        <div style={{ minWidth: `${minWidth}px`, height: '280px' }}>
          <Line data={bestChartData} options={bestChartOptions} />
        </div>
      </div>

      {perModelChartData && (
        <>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            Ridge vs Random Forest R²
          </p>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: `${minWidth}px`, height: '240px' }}>
              <Line data={perModelChartData} options={perModelOptions} />
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
