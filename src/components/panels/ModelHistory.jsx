import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

export default function ModelHistory({ data }) {
  if (!data) return null;
  if (!data?.history || data.history.length < 2) return null;

  const chartData = {
    labels: data.history.map(item => `${item.dataset_size} tracks`),
    datasets: [
      {
        label: 'R²',
        data: data.history.map(item => item.r_squared),
        borderColor: 'rgba(80, 200, 120, 0.92)',
        backgroundColor: 'rgba(80, 200, 120, 0.12)',
        yAxisID: 'y',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(80, 200, 120, 1)',
      },
      {
        label: 'RMSE',
        data: data.history.map(item => item.rmse),
        borderColor: 'rgba(255, 107, 107, 0.92)',
        backgroundColor: 'rgba(255, 107, 107, 0.12)',
        yAxisID: 'y1',
        tension: 0.32,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255, 107, 107, 1)',
      },
    ],
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

  return (
    <Panel id="history-panel" span={12}>
      <PanelHeader title="Model Over Time" note="Performance as the dataset grows" />
      {(() => {
        const h = data.history;
        const peak = h.reduce((best, cur) => cur.r_squared > best.r_squared ? cur : best, h[0]);
        const latest = h[h.length - 1];
        const trend = latest.r_squared >= peak.r_squared ? 'still climbing'
          : latest.r_squared >= peak.r_squared - 0.05 ? 'holding steady'
          : 'dipped since its peak';
        return (
          <p className="panel-insight">
            The model has been retrained {h.length} times. R² peaked at {peak.r_squared} with {peak.dataset_size} tracks — {trend}.
          </p>
        );
      })()}
      <div className="chart-shell compact">
        <Line data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
