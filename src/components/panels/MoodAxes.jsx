import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const AXIS_PAIRS = [
  { label: 'Valence × Arousal', x: 'avg_valence', y: 'avg_arousal', xLabel: 'Valence (sad → cheerful)', yLabel: 'Arousal (calm → intense)' },
  { label: 'Valence × Dominance', x: 'avg_valence', y: 'avg_dominance', xLabel: 'Valence (sad → cheerful)', yLabel: 'Dominance (gentle → powerful)' },
  { label: 'Arousal × Dominance', x: 'avg_arousal', y: 'avg_dominance', xLabel: 'Arousal (calm → intense)', yLabel: 'Dominance (gentle → powerful)' },
];

export default function MoodAxes({ data }) {
  const [pairIdx, setPairIdx] = useState(0);
  const ps = data?.predictions || [];
  const moodAxes = data?.mood_axes;

  const hidden = useMemo(() => {
    return !ps.length || ps[0].avg_valence === undefined;
  }, [ps]);

  const pair = AXIS_PAIRS[pairIdx];

  const chartData = useMemo(() => {
    if (hidden) return null;
    return {
      datasets: [{
        data: ps.map(p => ({
          x: p[pair.x],
          y: p[pair.y],
          title: p.title,
          artist: p.artist,
          rating: p.actual,
          moods: p.moods,
        })),
        backgroundColor: ps.map(p => ratingColor(p.actual)),
        pointRadius: 6,
        pointHoverRadius: 9,
      }],
    };
  }, [ps, pair, hidden]);

  const quadrantInsight = useMemo(() => {
    if (hidden || pair.x !== 'avg_valence' || pair.y !== 'avg_arousal') return null;
    const q = { hh: [], hl: [], lh: [], ll: [] };
    ps.forEach(p => {
      const v = p.avg_valence, a = p.avg_arousal;
      if (v >= 0 && a >= 0) q.hh.push(p);
      else if (v >= 0 && a < 0) q.hl.push(p);
      else if (v < 0 && a >= 0) q.lh.push(p);
      else q.ll.push(p);
    });
    const avg = arr => arr.length ? (arr.reduce((s, p) => s + p.actual, 0) / arr.length).toFixed(1) : '—';
    return {
      labels: ['Cheerful + Intense', 'Cheerful + Calm', 'Dark + Intense', 'Dark + Calm'],
      keys: ['hh', 'hl', 'lh', 'll'],
      counts: [q.hh.length, q.hl.length, q.lh.length, q.ll.length],
      avgs: [avg(q.hh), avg(q.hl), avg(q.lh), avg(q.ll)],
    };
  }, [ps, pair, hidden]);

  const topMoods = useMemo(() => {
    if (!moodAxes) return null;
    const entries = Object.entries(moodAxes);
    const byValence = [...entries].sort((a, b) => b[1].valence - a[1].valence);
    const byArousal = [...entries].sort((a, b) => b[1].arousal - a[1].arousal);
    return {
      highValence: byValence.slice(0, 5).map(([m]) => m),
      lowValence: byValence.slice(-5).reverse().map(([m]) => m),
      highArousal: byArousal.slice(0, 5).map(([m]) => m),
      lowArousal: byArousal.slice(-5).reverse().map(([m]) => m),
    };
  }, [moodAxes]);

  if (!data || hidden) return null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const d = ctx.raw;
            return `${d.title} — ${d.artist} (${d.rating}/10)`;
          },
          afterLabel: ctx => {
            const d = ctx.raw;
            return d.moods?.length ? d.moods.join(', ') : '';
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: pair.xLabel, color: GR.label, font: { weight: 800 } },
        min: -1, max: 1,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
      y: {
        title: { display: true, text: pair.yLabel, color: GR.label, font: { weight: 800 } },
        min: -1, max: 1,
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 0.5 },
      },
    },
  };

  return (
    <Panel id="mood-axes-panel" span={6}>
      <PanelHeader
        title="Mood Emotion Space"
        note="Tracks plotted by mood valence, arousal, and dominance — colored by rating"
      />
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {AXIS_PAIRS.map((ap, i) => (
          <button
            key={ap.label}
            onClick={() => setPairIdx(i)}
            style={{
              background: pairIdx === i ? 'var(--accent)' : 'transparent',
              border: '1px solid var(--accent)',
              color: pairIdx === i ? '#0f1f38' : 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '3px 10px',
              borderRadius: '12px',
              fontWeight: 650,
            }}
          >
            {ap.label}
          </button>
        ))}
      </div>
      <div className="chart-shell">
        <Scatter data={chartData} options={chartOptions} />
      </div>
      {quadrantInsight && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          {quadrantInsight.labels.map((label, i) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                {quadrantInsight.avgs[i]}<span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>/10</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{quadrantInsight.counts[i]} tracks</div>
            </div>
          ))}
        </div>
      )}
      {topMoods && (
        <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
          <div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Most cheerful moods</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {topMoods.highValence.map(m => (
                <span key={m} className="review-mood-tag">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Darkest moods</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {topMoods.lowValence.map(m => (
                <span key={m} className="review-mood-tag">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Most intense moods</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {topMoods.highArousal.map(m => (
                <span key={m} className="review-mood-tag">{m}</span>
              ))}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Calmest moods</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {topMoods.lowArousal.map(m => (
                <span key={m} className="review-mood-tag">{m}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
