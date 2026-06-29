import { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import { RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import ChartJS from 'chart.js/auto';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { GR } from '../../utils/chartDefaults';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ZONE_COLORS = {
  euphoric: 'rgba(255, 200, 50, 0.6)',
  tense: 'rgba(200, 50, 50, 0.6)',
  introspective: 'rgba(100, 100, 150, 0.6)',
  serene: 'rgba(100, 200, 150, 0.6)',
};

const ZONE_BORDER_COLORS = {
  euphoric: 'rgba(255, 200, 50, 1)',
  tense: 'rgba(200, 50, 50, 1)',
  introspective: 'rgba(100, 100, 150, 1)',
  serene: 'rgba(100, 200, 150, 1)',
};

const AUDIO_FEATURES = ['Acousticness', 'Danceability', 'Instrumentalness', 'Liveness', 'Loudness'];

export default function MoodZoneProfiles({ data }) {
  const { chart } = useMemo(() => {
    if (!data?.predictions) return { chart: null };

    const ps = data.predictions.filter(p => p.mood_zone && p.acousticness != null);
    if (!ps.length) return { chart: null };

    const zones = ['euphoric', 'tense', 'introspective', 'serene'];
    const profiles = {};

    zones.forEach(zone => {
      const tracks = ps.filter(p => p.mood_zone === zone);
      if (tracks.length > 0) {
        const norm = (val, min, max) => Math.max(0, Math.min(1, (val - min) / (max - min)));
        profiles[zone] = [
          tracks.reduce((s, t) => s + t.acousticness, 0) / tracks.length,
          tracks.reduce((s, t) => s + t.danceability, 0) / tracks.length,
          tracks.reduce((s, t) => s + t.instrumentalness, 0) / tracks.length,
          tracks.reduce((s, t) => s + t.liveness, 0) / tracks.length,
          norm(tracks.reduce((s, t) => s + (t.loudness || -10), 0) / tracks.length, -35, 0),
        ];
      } else {
        profiles[zone] = [0, 0, 0, 0, 0];
      }
    });

    const chartData = {
      labels: AUDIO_FEATURES,
      datasets: zones.map(zone => ({
        label: zone.charAt(0).toUpperCase() + zone.slice(1),
        data: profiles[zone],
        borderColor: ZONE_BORDER_COLORS[zone],
        backgroundColor: ZONE_COLORS[zone],
        borderWidth: 2,
        pointBackgroundColor: ZONE_BORDER_COLORS[zone],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      })),
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: GR.label, padding: 15 } },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
        },
      },
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { color: GR.tick, stepSize: 0.2 },
          grid: { color: GR.grid },
          pointLabels: { color: GR.label },
        },
      },
    };

    return { chart: { data: chartData, options } };
  }, [data]);

  if (!chart) return null;

  return (
    <Panel id="mood-zone-profiles" span={6}>
      <PanelHeader title="Audio Fingerprints" note="Radar: acoustic profiles per zone" />
      <div style={{ height: 350 }}>
        <Radar data={chart.data} options={chart.options} />
      </div>
    </Panel>
  );
}
