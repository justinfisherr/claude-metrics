import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function InstrumentCombos({ data }) {
  const [selected, setSelected] = useState('');

  const { filtered, labels, avgs, colors, empty, comboTracks } = useMemo(() => {
    const ps = data?.predictions || [];
    if (!ps.length) return { filtered: [], labels: [], avgs: [], colors: [], empty: true, comboTracks: {} };

    const combos = {};
    const tracksByCombo = {};
    ps.forEach(p => {
      const parts = [];
      if (p.primary_instrument) parts.push(p.primary_instrument);
      if (p.has_vocals) parts.push('vocals');
      if (p.has_guitar) parts.push('guitar');
      if (p.is_pianoless === 0 && p.primary_instrument !== 'piano') parts.push('piano');
      parts.sort();
      const key = parts.join(' + ');
      if (!combos[key]) combos[key] = { sum: 0, n: 0, liked: 0 };
      combos[key].sum += p.actual;
      combos[key].n++;
      if (p.liked) combos[key].liked++;
      if (!tracksByCombo[key]) tracksByCombo[key] = [];
      tracksByCombo[key].push(p);
    });

    const f = Object.entries(combos)
      .filter(([, v]) => v.n >= 2)
      .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n));

    if (!f.length) return { filtered: f, labels: [], avgs: [], colors: [], empty: true, comboTracks: {} };

    return {
      filtered: f,
      labels: f.map(e => `${e[0]} (${e[1].n})`),
      avgs: f.map(e => +(e[1].sum / e[1].n).toFixed(2)),
      colors: f.map(e => e[1].liked / e[1].n > 0.5 ? '#50c878' : '#ff6b6b'),
      empty: false,
      comboTracks: tracksByCombo,
    };
  }, [data]);

  if (!data || empty) return null;

  const chartData = {
    labels,
    datasets: [{
      data: avgs,
      backgroundColor: colors,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    onClick: (evt, elements) => {
      if (elements.length) {
        const comboKey = filtered[elements[0].index][0];
        setSelected(comboKey);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `avg ${ctx.raw}/10`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 10,
        title: { display: true, text: 'Average Rating', color: GR.label, font: { weight: 800 } },
        grid: { color: GR.grid },
        ticks: { color: GR.tick, stepSize: 1 },
      },
      y: {
        grid: { display: false },
        ticks: { color: GR.tick, font: { size: 10 } },
      },
    },
  };

  return (
    <Panel id="instrument-combos-panel" span={12}>
      <PanelHeader title="Instrument Combinations" note="Which instrument pairings rate highest" />
      {filtered.length > 0 && (() => {
        const top = filtered[0];
        const comboName = top[0];
        const avg = (top[1].sum / top[1].n).toFixed(1);
        const parts = comboName.split(' + ');
        const interp = parts.length >= 3
          ? 'You gravitate toward fuller ensemble textures with layered voices.'
          : parts.length === 1
            ? 'You tend to prefer a stripped-down, solo-focused sound.'
            : `The ${parts.join('/')} pairing is your sweet spot for ensemble texture.`;
        return (
          <p className="panel-insight">
            Your highest-rated combo is {comboName} (avg {avg}). {interp}
          </p>
        );
      })()}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
      {selected && comboTracks[selected] && (() => {
        const tracks = [...comboTracks[selected]].sort((a, b) => b.actual - a.actual);
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
