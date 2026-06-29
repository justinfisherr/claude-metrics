import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import ChartJS from 'chart.js/auto';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ZONE_COLORS = {
  euphoric: 'rgba(255, 200, 50, 0.8)',
  tense: 'rgba(200, 50, 50, 0.8)',
  introspective: 'rgba(100, 100, 150, 0.8)',
  serene: 'rgba(100, 200, 150, 0.8)',
};

export default function MoodZoneRatings({ data }) {
  const { chart } = useMemo(() => {
    if (!data?.predictions) return { chart: null };

    const ps = data.predictions.filter(p => p.mood_zone);
    if (!ps.length) return { chart: null };

    const zones = ['euphoric', 'tense', 'introspective', 'serene'];
    const stats = {};

    zones.forEach(zone => {
      const tracks = ps.filter(p => p.mood_zone === zone);
      if (tracks.length > 0) {
        const avg = tracks.reduce((sum, t) => sum + t.actual, 0) / tracks.length;
        stats[zone] = { avg: parseFloat(avg.toFixed(2)), count: tracks.length };
      } else {
        stats[zone] = { avg: 0, count: 0 };
      }
    });

    const chartData = {
      labels: zones.map(z => z.charAt(0).toUpperCase() + z.slice(1)),
      datasets: [
        {
          label: 'Avg Rating',
          data: zones.map(z => stats[z].avg),
          backgroundColor: zones.map(z => ZONE_COLORS[z]),
          borderColor: zones.map(z => ZONE_COLORS[z]),
          borderWidth: 1,
        },
      ],
    };

    const options = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: GR.label } },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.8)',
          callbacks: {
            afterLabel: (ctx) => {
              const zone = zones[ctx.dataIndex];
              return `Tracks: ${stats[zone].count}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 10,
          ticks: { color: GR.tick },
          grid: { color: GR.grid },
        },
        y: { ticks: { color: GR.tick }, grid: { color: GR.grid } },
      },
    };

    return { chart: { data: chartData, options } };
  }, [data]);

  if (!chart) return null;

  return (
    <Panel id="mood-zone-ratings" span={6}>
      <PanelHeader title="Avg Rating by Zone" />
      <div style={{ height: 250 }}>
        <Bar data={chart.data} options={chart.options} />
      </div>
    </Panel>
  );
}
