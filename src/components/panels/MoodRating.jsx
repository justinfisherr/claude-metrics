import { useState, useMemo } from 'react';
import Panel from '../shared/Panel';

const BUCKETS = [
  { label: '2–3', min: 2, max: 3.5 },
  { label: '4–5', min: 3.5, max: 5.5 },
  { label: '6–7', min: 5.5, max: 7.5 },
  { label: '8–9', min: 7.5, max: 9.5 },
  { label: '10', min: 9.5, max: 10.5 },
];

export default function MoodRating({ data }) {
  const [open, setOpen] = useState(false);

  const { moods, mc, mx } = useMemo(() => {
    const predictions = data?.predictions || [];
    const moodCounts = {};

    predictions.forEach(p => {
      (p.moods || []).forEach(mood => {
        moodCounts[mood] = moodCounts[mood] || {};
        BUCKETS.forEach(b => {
          moodCounts[mood][b.label] = moodCounts[mood][b.label] || 0;
          if (p.actual >= b.min && p.actual < b.max) moodCounts[mood][b.label]++;
        });
      });
    });

    const sortedMoods = Object.keys(moodCounts).sort((a, b) => {
      const ta = Object.values(moodCounts[a]).reduce((s, v) => s + v, 0);
      const tb = Object.values(moodCounts[b]).reduce((s, v) => s + v, 0);
      return tb - ta;
    });

    const maxVal = Math.max(...sortedMoods.flatMap(m => Object.values(moodCounts[m])));

    return { moods: sortedMoods, mc: moodCounts, mx: maxVal };
  }, [data]);

  if (!data) return null;

  function cellBg(count, bucket) {
    if (count === 0) return 'transparent';
    const a = Math.min(count / mx * 0.65 + 0.15, 0.72);
    if (bucket.min >= 7.5) return `rgba(80,200,120,${a})`;
    if (bucket.max <= 5.5) return `rgba(255,107,107,${a})`;
    return `rgba(74,158,255,${a})`;
  }

  return (
    <Panel id="mood-rating-panel" span={6}>
      <div className="panel-header">
        <button
          className="accordion-toggle"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <div>
            <h2>Mood × Rating</h2>
            <p className="panel-note">Which moods show up at each rating level</p>
          </div>
          <span className="accordion-arrow" aria-hidden="true">▼</span>
        </button>
      </div>

      <div
        className={`accordion-body${open ? '' : ' collapsed'}`}
        style={open ? {} : { maxHeight: 0 }}
      >
        <p className="panel-desc">
          A cross-tab of <strong>mood tags</strong> (rows) vs <strong>rating buckets</strong> (columns: 2–3, 4–5, 6–7, 8–9, 10). Each cell shows how many of your tracks carry that mood and fall in that rating range. <strong>Green</strong> = high-rating bucket (8–10). <strong>Blue</strong> = mid-range (6–7). <strong>Red</strong> = low-range (2–5). Darker shading = more tracks.
        </p>
        <div className="table-scroll" tabIndex={0}>
          <table className="heatmap-table">
            <thead>
              <tr>
                <th></th>
                {BUCKETS.map(b => <th key={b.label}>{b.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {moods.map(mood => (
                <tr key={mood}>
                  <th>{mood}</th>
                  {BUCKETS.map(b => {
                    const c = mc[mood]?.[b.label] || 0;
                    return (
                      <td key={b.label} style={{ background: cellBg(c, b) }}>
                        {c || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
