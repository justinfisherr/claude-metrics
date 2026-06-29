import { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { LinearScale, PointElement, Tooltip, Filler } from 'chart.js';
import ChartJS from 'chart.js/auto';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(LinearScale, PointElement, Tooltip, Filler);

const ZONE_COLORS = {
  euphoric: 'rgba(255, 200, 50, 0.8)',
  tense: 'rgba(200, 50, 50, 0.8)',
  introspective: 'rgba(100, 100, 150, 0.8)',
  serene: 'rgba(100, 200, 150, 0.8)',
};

const ZONE_NAMES = {
  euphoric: 'Euphoric (bright + energetic)',
  tense: 'Tense (dark + energetic)',
  introspective: 'Introspective (dark + calm)',
  serene: 'Serene (bright + calm)',
};

export default function MoodZoneMap({ data }) {
  const { chart, cards } = useMemo(() => {
    if (!data?.predictions) return { chart: null, cards: [] };

    const ps = data.predictions.filter(p => p.spotify_valence != null && p.spotify_energy != null);
    if (!ps.length) return { chart: null, cards: [] };

    const datasets = {};
    ['euphoric', 'tense', 'introspective', 'serene'].forEach(zone => {
      datasets[zone] = [];
    });

    ps.forEach(p => {
      const zone = p.mood_zone || 'unknown';
      if (zone !== 'unknown') {
        datasets[zone].push({
          x: p.spotify_valence,
          y: p.spotify_energy,
          r: 4 + p.danceability * 4,
          _p: p,
        });
      }
    });

    const chartDatasets = [];
    Object.entries(datasets).forEach(([zone, points]) => {
      if (points.length > 0) {
        chartDatasets.push({
          label: ZONE_NAMES[zone],
          data: points,
          backgroundColor: ZONE_COLORS[zone],
          borderColor: ZONE_COLORS[zone],
          borderWidth: 1,
          showLine: false,
        });
      }
    });

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: GR.label, padding: 15 } },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          callbacks: {
            title: (ctx) => ctx[0]?._p?.title || '',
            label: (ctx) => {
              const p = ctx._p;
              return [
                p.artist,
                `Rating: ${p.actual}/10`,
                `Zone: ${p.mood_zone || 'unknown'}`,
                `Valence: ${p.spotify_valence?.toFixed(2)}, Energy: ${p.spotify_energy?.toFixed(2)}`,
                `Dance: ${p.danceability?.toFixed(2)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 1,
          title: { display: true, text: 'Valence (sad ← → bright)', color: GR.label },
          ticks: { color: GR.tick },
          grid: { color: GR.grid },
        },
        y: {
          type: 'linear',
          min: 0,
          max: 1,
          title: { display: true, text: 'Energy (calm ← → intense)', color: GR.label },
          ticks: { color: GR.tick },
          grid: { color: GR.grid },
        },
      },
    };

    return { chart: { datasets: chartDatasets, options }, cards: [] };
  }, [data]);

  if (!chart) return null;

  return (
    <Panel id="mood-zone-map" span={12}>
      <PanelHeader title="Mood Zone Map" note="2D space: valence × energy. Dot size = danceability" />
      <div style={{ height: 400 }}>
        <Scatter data={{ datasets: chart.datasets }} options={chart.options} />
      </div>
    </Panel>
  );
}
