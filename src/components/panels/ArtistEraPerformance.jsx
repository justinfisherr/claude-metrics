import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import Card from '../shared/Card';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ArtistEraPerformance({ data }) {
  const artistEraMetrics = useMemo(() => {
    if (!data?.predictions) return [];

    const metrics = {};
    data.predictions.forEach(p => {
      const key = `${p.artist}|${p.era || 'Unknown'}`;
      if (!metrics[key]) metrics[key] = { artist: p.artist, era: p.era || 'Unknown', ratings: [] };
      metrics[key].ratings.push(p.actual);
    });

    return Object.values(metrics)
      .filter(m => m.ratings.length >= 2)
      .map(m => ({
        ...m,
        mean: parseFloat((m.ratings.reduce((a, b) => a + b, 0) / m.ratings.length).toFixed(2)),
        count: m.ratings.length,
      }))
      .sort((a, b) => b.mean - a.mean)
      .slice(0, 15);
  }, [data]);

  const chartData = useMemo(() => ({
    labels: artistEraMetrics.map(m => [m.artist, `(${m.era})`]),
    datasets: [{
      label: 'Mean Rating',
      data: artistEraMetrics.map(m => m.mean),
      backgroundColor: artistEraMetrics.map(m => m.mean >= 7 ? '#50c878' : m.mean >= 5 ? '#ffc832' : '#ff6b6b'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [artistEraMetrics]);

  if (!artistEraMetrics.length) return null;

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        min: 0,
        max: 10,
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#87a2c3', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 9 } },
      },
    },
  };

  return (
    <Card title="Artist × Era Performance" span="span-6">
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
        Top 15 artist-era combinations by mean rating (2+ tracks)
      </p>
      <div style={{ height: '350px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </Card>
  );
}
