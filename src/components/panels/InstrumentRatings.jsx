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

export default function InstrumentRatings({ data }) {
  const [selectedInstrument, setSelectedInstrument] = useState('');

  const sorted = useMemo(() => {
    const predictions = data?.predictions || [];
    const groups = {};

    predictions.forEach(p => {
      if (!p.primary_instrument) return;
      if (!groups[p.primary_instrument]) groups[p.primary_instrument] = [];
      groups[p.primary_instrument].push(p);
    });

    return Object.entries(groups)
      .filter(([, tracks]) => tracks.length >= 2)
      .map(([inst, tracks]) => ({
        inst,
        avg: tracks.reduce((s, t) => s + t.actual, 0) / tracks.length,
        count: tracks.length,
        tracks,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  if (!data) return null;

  const selectedItem = sorted.find(s => s.inst === selectedInstrument);
  const breakdownTracks = selectedItem
    ? [...selectedItem.tracks].sort((a, b) => b.actual - a.actual)
    : [];

  const chartData = {
    labels: sorted.map(s => s.inst),
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
    <Panel id="instrument-panel" span={6}>
      <PanelHeader title="Rating by Instrument" note="Average score per primary instrument" />
      {sorted.length >= 2 && (() => {
        const top = sorted[0];
        const bottom = sorted[sorted.length - 1];
        const gap = top.avg - bottom.avg;
        const interp = gap > 2
          ? `${bottom.inst}-led tracks haven't clicked the same way`
          : 'your taste is fairly even across lead instruments';
        return (
          <p className="panel-insight">
            Tracks led by {top.inst} average {top.avg.toFixed(1)} — your favorite voice in jazz. {bottom.inst} averages {bottom.avg.toFixed(1)}, suggesting {interp}.
          </p>
        );
      })()}
      <div className="chart-shell">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="breakdown-dropdown">
        <select
          className="breakdown-select"
          value={selectedInstrument}
          onChange={e => setSelectedInstrument(e.target.value)}
        >
          <option value="">View tracks by instrument...</option>
          {sorted.map(s => (
            <option key={s.inst} value={s.inst}>
              {s.inst} ({s.count} tracks, avg {Math.round(s.avg * 10) / 10})
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
