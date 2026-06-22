import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend } from 'chart.js';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend);

export default function PredVsActual({ data }) {
  if (!data) return null;
  const predictions = data?.predictions || [];
  if (!predictions.length) return null;

  const liked = predictions.filter(p => p.liked);
  const notLiked = predictions.filter(p => !p.liked);

  const chartData = {
    datasets: [
      {
        label: 'Liked',
        data: liked.map(p => ({ x: p.actual, y: p.predicted, title: p.title })),
        backgroundColor: 'rgba(80, 200, 120, 0.66)',
        borderColor: 'rgba(80, 200, 120, 0.95)',
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Not Liked',
        data: notLiked.map(p => ({ x: p.actual, y: p.predicted, title: p.title })),
        backgroundColor: 'rgba(255, 107, 107, 0.66)',
        borderColor: 'rgba(255, 107, 107, 0.95)',
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: 'Perfect',
        data: [{ x: 1, y: 1 }, { x: 10, y: 10 }],
        type: 'line',
        borderColor: 'rgba(74, 158, 255, 0.34)',
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
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
        callbacks: {
          label: (context) => {
            const point = context.raw;
            return point.title
              ? `${point.title}: actual ${point.x}, predicted ${point.y}`
              : 'Perfect prediction line';
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Actual', color: GR.label, font: { weight: 800 } },
        min: 1,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
      y: {
        title: { display: true, text: 'Predicted', color: GR.label, font: { weight: 800 } },
        min: 1,
        max: 10,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
    },
  };

  return (
    <Panel id="pred-actual-panel" span={6}>
      <PanelHeader title="Predicted vs Actual Rating" note="How close the model got" />
      {(() => {
        const bigMisses = predictions.filter(p => Math.abs(p.actual - p.predicted) > 2).length;
        return (
          <p className="panel-insight">
            Points on the diagonal are tracks the model nailed. {bigMisses} track{bigMisses !== 1 ? 's are' : ' is'} more than 2 points off — {bigMisses > 0 ? 'those are where your taste surprises the model' : 'the model has a solid read on your taste'}.
          </p>
        );
      })()}
      <p className="panel-desc">
        Each dot is a track. <strong>X axis</strong> = your actual rating (1&ndash;10). <strong>Y axis</strong> = the model's LOOCV prediction. Dots on the <strong>dashed diagonal</strong> are perfect predictions. Dots <em>above</em> the line = model over-predicted; <em>below</em> = under-predicted. <strong>Green</strong> = tracks you marked "liked", <strong>red</strong> = not liked. Large horizontal gaps are your model's biggest misses — useful data points to investigate. Hover any dot for the track name.
      </p>
      <div className="chart-shell">
        <Scatter data={chartData} options={chartOptions} />
      </div>
    </Panel>
  );
}
