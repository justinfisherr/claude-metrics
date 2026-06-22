import { useMemo, useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { GR, CLUSTER_COLORS, ratingColor } from '../../utils/chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function colorFor(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export default function LabelBreakdown({ data }) {
  const [selectedLabel, setSelectedLabel] = useState('');

  const sorted = useMemo(() => {
    const predictions = data?.predictions || [];
    const groups = {};

    predictions.forEach(p => {
      if (!p.label) return;
      if (!groups[p.label]) groups[p.label] = [];
      groups[p.label].push(p);
    });

    return Object.entries(groups)
      .filter(([, tracks]) => tracks.length >= 2)
      .map(([label, tracks]) => ({
        label,
        avg: tracks.reduce((s, t) => s + t.actual, 0) / tracks.length,
        count: tracks.length,
        tracks,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  if (!data) return null;

  const selectedItem = sorted.find(s => s.label === selectedLabel);
  const breakdownTracks = selectedItem
    ? [...selectedItem.tracks].sort((a, b) => b.actual - a.actual)
    : [];

  const chartData = {
    labels: sorted.map(s => s.label),
    datasets: [{
      label: 'Avg Rating',
      data: sorted.map(s => Math.round(s.avg * 100) / 100),
      backgroundColor: sorted.map((_, i) => colorFor(i)),
      borderColor: sorted.map((_, i) => colorFor(i)),
      borderWidth: 1,
      borderRadius: 7,
      borderSkipped: false,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: c => {
            const item = sorted[c.dataIndex];
            return `Avg: ${c.raw}/10 · ${item.count} track${item.count !== 1 ? 's' : ''}`;
          },
        },
      },
    },
    scales: {
      x: { min: 0, max: 10, grid: { color: GR.grid }, ticks: { color: GR.tick } },
      y: { grid: { display: false }, ticks: { color: GR.label, font: { size: 11, weight: 650 } } },
    },
  };

  return (
    <Panel id="label-panel" span={6}>
      <PanelHeader title="Label Breakdown" note="Average rating and track count by record label" />
      {sorted.length > 0 && (() => {
        const labelContext = {
          'Blue Note': 'the home of hard bop and modern jazz royalty',
          'Prestige': 'marathon blowing sessions and raw post-bop energy',
          'Riverside': 'thoughtfully produced sessions with deep catalogs',
          'Impulse!': 'boundary-pushing jazz from Coltrane to Ayler',
          'Columbia': 'crossover ambition and landmark studio productions',
          'Verve': 'lush, vocal-friendly jazz and West Coast cool',
          'ECM': 'spacious, European-tinged modern jazz',
          'Contemporary': 'the West Coast cool jazz institution',
          'Atlantic': 'soul-jazz and adventurous hard bop',
          'Savoy': 'early bebop history and rare sessions',
        };
        const top = sorted[0];
        const context = labelContext[top.label] || `a label known for quality jazz`;
        return (
          <p className="panel-insight">
            Your highest-rated label is {top.label} (avg {top.avg.toFixed(1)}) — {context}.
          </p>
        );
      })()}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="breakdown-dropdown">
        <select
          className="breakdown-select"
          value={selectedLabel}
          onChange={e => setSelectedLabel(e.target.value)}
        >
          <option value="">View tracks by label...</option>
          {sorted.map(s => (
            <option key={s.label} value={s.label}>
              {s.label} ({s.count} tracks, avg {Math.round(s.avg * 10) / 10})
            </option>
          ))}
        </select>
        {breakdownTracks.length > 0 && (
          <div className="breakdown-tracks">
            {breakdownTracks.map((t, i) => (
              <div key={i} className="breakdown-track">
                <div>
                  <span className="breakdown-track-title">{t.title}</span>
                  <span className="breakdown-track-artist">— {t.artist}</span>
                </div>
                <span className="breakdown-track-rating" style={{ color: ratingColor(t.actual) }}>
                  {t.actual}/10
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
