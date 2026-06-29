import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import Card from '../shared/Card';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BalladAnalysis({ data }) {
  if (!data?.predictions) return null;

  const stats = useMemo(() => {
    const ballads = data.predictions.filter(p => p.subgenre && (
      p.subgenre.includes('ballad') ||
      p.subgenre.includes('piano ballad') ||
      p.subgenre.includes('tenor ballad') ||
      p.subgenre.includes('vocal ballad')
    ));

    const instrumental = ballads.filter(b => b.has_vocals === 0);
    const vocal = ballads.filter(b => b.has_vocals === 1);
    const nonBallads = data.predictions.filter(p => !ballads.find(b => b.title === p.title));

    const getStats = (tracks) => {
      if (!tracks.length) return { mean: 0, count: 0 };
      const ratings = tracks.map(t => t.actual);
      return {
        mean: (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(2),
        count: tracks.length,
        std: tracks.length > 1 ? ((ratings.reduce((a, b) => a + (b - ratings.reduce((x, y) => x + y) / ratings.length) ** 2) / (ratings.length - 1)) ** 0.5).toFixed(2) : '—',
      };
    };

    return {
      ballads: getStats(ballads),
      instrumental: getStats(instrumental),
      vocal: getStats(vocal),
      nonBallads: getStats(nonBallads),
      totalTracks: data.predictions.length,
    };
  }, [data]);

  const balladsPercent = ((stats.ballads.count / stats.totalTracks) * 100).toFixed(0);

  const chartData = useMemo(() => {
    return {
      labels: ['All Ballads', 'Instrumental', 'Vocal', 'Non-Ballads'],
      datasets: [{
        label: 'Mean Rating',
        data: [stats.ballads.mean, stats.instrumental.mean, stats.vocal.mean, stats.nonBallads.mean],
        backgroundColor: ['#87a2c3', '#ffc832', '#ff6b6b', '#50c878'],
        borderColor: ['#87a2c3', '#ffc832', '#ff6b6b', '#50c878'],
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#87a2c3', font: { size: 10 } },
        max: 10,
      },
      x: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 9 } },
      },
    },
  };

  return (
    <Card title="Ballad × Vocal Split Analysis" span="span-6">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Left: Chart */}
        <div style={{ height: '250px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Right: Stats */}
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              All Ballads
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#50c878', marginTop: '0.2rem' }}>
              {stats.ballads.mean}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              {stats.ballads.count} tracks ({balladsPercent}% of dataset)
            </div>
          </div>

          <div style={{ marginBottom: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Instrumental Ballads
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffc832', marginTop: '0.2rem' }}>
              {stats.instrumental.mean}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              {stats.instrumental.count} tracks
            </div>
          </div>

          <div style={{ paddingTop: '0.8rem', borderTop: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Vocal Ballads
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ff6b6b', marginTop: '0.2rem' }}>
              {stats.vocal.mean}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              {stats.vocal.count} tracks
            </div>
          </div>
        </div>

        {/* Right: Non-ballads */}
        <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--border-faint)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Non-Ballads
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#87a2c3', marginTop: '0.2rem' }}>
            {stats.nonBallads.mean}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            {stats.nonBallads.count} tracks ({((stats.nonBallads.count / stats.totalTracks) * 100).toFixed(0)}% of dataset)
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--muted)', padding: '0.6rem', backgroundColor: 'rgba(93,155,224,0.05)', borderRadius: '0.3rem' }}>
            <strong>Insight:</strong> {
              stats.instrumental.mean > stats.vocal.mean
                ? `Instrumental ballads rate ${(stats.instrumental.mean - stats.vocal.mean).toFixed(1)} points higher than vocal ballads`
                : `Vocal ballads rate ${(stats.vocal.mean - stats.instrumental.mean).toFixed(1)} points higher than instrumental ballads`
            }
          </div>
        </div>
      </div>
    </Card>
  );
}
