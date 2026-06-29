import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import Card from '../shared/Card';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BALLAD_SUBGENRES = ['ballad', 'piano ballad', 'tenor ballad', 'vocal ballad'];

export default function BalladAnalysis({ data }) {
  const stats = useMemo(() => {
    if (!data?.predictions) return null;
    const ballads = data.predictions.filter(p =>
      Array.isArray(p.subgenres) && p.subgenres.some(sg => BALLAD_SUBGENRES.includes(sg))
    );
    const instrumental = ballads.filter(b => b.has_vocals === 0);
    const vocal = ballads.filter(b => b.has_vocals === 1);
    const nonBallads = data.predictions.filter(p =>
      !Array.isArray(p.subgenres) || !p.subgenres.some(sg => BALLAD_SUBGENRES.includes(sg))
    );

    const getStats = (tracks) => {
      if (!tracks.length) return { mean: null, count: 0 };
      const ratings = tracks.map(t => t.actual);
      const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      return { mean: parseFloat(mean.toFixed(2)), count: tracks.length };
    };

    return {
      ballads: getStats(ballads),
      instrumental: getStats(instrumental),
      vocal: getStats(vocal),
      nonBallads: getStats(nonBallads),
      totalTracks: data.predictions.length,
    };
  }, [data]);

  const chartData = useMemo(() => ({
    labels: ['All Ballads', 'Instrumental', 'Vocal', 'Non-Ballads'],
    datasets: [{
      label: 'Mean Rating',
      data: stats ? [stats.ballads.mean, stats.instrumental.mean, stats.vocal.mean, stats.nonBallads.mean] : [],
      backgroundColor: ['#87a2c3', '#ffc832', '#ff6b6b', '#50c878'],
      borderColor: ['#87a2c3', '#ffc832', '#ff6b6b', '#50c878'],
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 10,
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#87a2c3', font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 9 } },
      },
    },
  };

  if (!stats) return null;

  const instrMean = stats.instrumental.mean ?? 0;
  const vocalMean = stats.vocal.mean ?? 0;
  const insightText = stats.instrumental.count && stats.vocal.count
    ? instrMean > vocalMean
      ? `Instrumental ballads rate ${(instrMean - vocalMean).toFixed(1)} pts higher than vocal`
      : `Vocal ballads rate ${(vocalMean - instrMean).toFixed(1)} pts higher than instrumental`
    : 'Not enough data to compare vocal vs instrumental ballads';

  return (
    <Card title="Ballad × Vocal Split Analysis" span="span-6">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
        {/* Left: chart */}
        <div style={{ height: '260px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Right: stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <Stat label="All Ballads" value={stats.ballads.mean} color="#87a2c3"
            sub={`${stats.ballads.count} tracks (${((stats.ballads.count / stats.totalTracks) * 100).toFixed(0)}% of dataset)`} size="lg" />
          <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: '0.8rem', display: 'flex', gap: '1rem' }}>
            <Stat label="Instrumental" value={stats.instrumental.mean} color="#ffc832"
              sub={`${stats.instrumental.count} tracks`} size="sm" />
            <Stat label="Vocal" value={stats.vocal.mean} color="#ff6b6b"
              sub={`${stats.vocal.count} tracks`} size="sm" />
          </div>
          <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: '0.8rem' }}>
            <Stat label="Non-Ballads" value={stats.nonBallads.mean} color="#50c878"
              sub={`${stats.nonBallads.count} tracks`} size="lg" />
          </div>
          <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: 'var(--muted)', padding: '0.5rem 0.6rem', backgroundColor: 'rgba(93,155,224,0.06)', borderRadius: '0.3rem' }}>
            <strong>Insight:</strong> {insightText}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, color, sub, size }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: size === 'lg' ? '1.8rem' : '1.3rem', fontWeight: 'bold', color, marginTop: '0.1rem' }}>
        {value != null ? value : '—'}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{sub}</div>
    </div>
  );
}
