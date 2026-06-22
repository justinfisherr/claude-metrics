import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PAIRS = [
  { label: 'Has Piano', filter: p => !p.is_pianoless },
  { label: 'No Piano', filter: p => !!p.is_pianoless },
  { label: 'Has Vocals', filter: p => !!p.has_vocals },
  { label: 'Instrumental', filter: p => !p.has_vocals },
  { label: 'Has Guitar', filter: p => !!p.has_guitar },
  { label: 'No Guitar', filter: p => !p.has_guitar },
];

const COLORS = [
  'rgba(74,158,255,0.65)', 'rgba(74,158,255,0.3)',
  'rgba(80,200,120,0.65)', 'rgba(80,200,120,0.3)',
  'rgba(255,193,68,0.65)', 'rgba(255,193,68,0.3)',
];

export default function SoundProfile({ data }) {
  const [selected, setSelected] = useState('');

  const { avgs, counts } = useMemo(() => {
    const predictions = data?.predictions || [];
    if (!predictions.length) return { avgs: [], counts: [] };

    const a = PAIRS.map(({ filter }) => {
      const group = predictions.filter(filter);
      return group.length
        ? Math.round(group.reduce((s, p) => s + p.actual, 0) / group.length * 100) / 100
        : null;
    });
    const c = PAIRS.map(({ filter }) => predictions.filter(filter).length);

    return { avgs: a, counts: c };
  }, [data]);

  if (!data || !avgs.length) return null;

  const chartData = {
    labels: PAIRS.map(p => p.label),
    datasets: [{
      label: 'Avg Rating',
      data: avgs,
      backgroundColor: COLORS,
      borderColor: COLORS.map(c => c.replace(/[\d.]+\)$/, '1)')),
      borderWidth: 1.5,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (evt, elements) => {
      if (elements.length) setSelected(PAIRS[elements[0].index].label);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: c => {
            const i = c.dataIndex;
            return `Avg: ${c.raw}/10 · ${counts[i]} track${counts[i] !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: GR.tick, font: { size: 11, weight: 700 } } },
      y: { min: 0, max: 10, grid: { color: GR.grid }, ticks: { color: GR.tick, stepSize: 2 } },
    },
  };

  const spInsight = (() => {
    if (!avgs.length || avgs.every(a => a === null)) return null;
    // PAIRS: 0=Has Piano, 1=No Piano, 2=Has Vocals, 3=Instrumental, 4=Has Guitar, 5=No Guitar
    const pianoAvg = avgs[0];
    const noPianoAvg = avgs[1];
    // Find the biggest spread across the three pairs
    const pairs = [
      { name: 'piano', with: avgs[0], without: avgs[1], withLabel: 'piano', withoutLabel: 'pianoless' },
      { name: 'vocals', with: avgs[2], without: avgs[3], withLabel: 'vocal', withoutLabel: 'instrumental' },
      { name: 'guitar', with: avgs[4], without: avgs[5], withLabel: 'guitar', withoutLabel: 'guitar-free' },
    ].filter(p => p.with !== null && p.without !== null);
    const biggestGap = pairs.length
      ? pairs.reduce((best, p) => Math.abs(p.with - p.without) > Math.abs(best.with - best.without) ? p : best)
      : null;
    return { pianoAvg, noPianoAvg, biggestGap };
  })();

  return (
    <Panel id="sound-panel" span={6}>
      <PanelHeader title="Sound Profile" note="Average rating by instrumentation features" />
      {spInsight && spInsight.pianoAvg !== null && spInsight.noPianoAvg !== null && (
        <p className="panel-insight">
          Tracks with piano average {spInsight.pianoAvg} vs {spInsight.noPianoAvg} without.{' '}
          {spInsight.biggestGap
            ? spInsight.biggestGap.with > spInsight.biggestGap.without
              ? `Your strongest preference is for ${spInsight.biggestGap.withLabel} tracks — that instrument colors your experience.`
              : `You actually lean toward ${spInsight.biggestGap.withoutLabel} arrangements — that absence shapes your sound.`
            : 'Your ratings are fairly even across instrumentation — tone matters more than lineup.'}
        </p>
      )}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
      {selected && (() => {
        const pair = PAIRS.find(p => p.label === selected);
        if (!pair) return null;
        const predictions = data?.predictions || [];
        const tracks = predictions.filter(pair.filter).sort((a, b) => b.actual - a.actual);
        if (!tracks.length) return null;
        return (
          <div className="breakdown-dropdown">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <strong style={{color:'var(--accent)',fontSize:'0.82rem'}}>{selected}</strong>
              <button onClick={() => setSelected('')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'0.8rem'}}>&#10005; Close</button>
            </div>
            <div className="breakdown-tracks">
              {tracks.map((t, i) => (
                <div key={i} className="breakdown-track">
                  <div>
                    <span className="breakdown-track-title">{t.title}</span>
                    <span className="breakdown-track-artist">— {t.artist}</span>
                  </div>
                  <span className="breakdown-track-rating" style={{color: ratingColor(t.actual)}}>{t.actual}/10</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}
