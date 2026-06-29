import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Navigation from '../components/shared/Navigation';
import '../styles/compare.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function Compare() {
  const [manifest, setManifest] = useState(null);
  const [loadable, setLoadable] = useState([]);
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [entryA, setEntryA] = useState(null);
  const [entryB, setEntryB] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Load manifest
  useEffect(() => {
    fetch('versions.json')
      .then(r => r.json())
      .then(m => {
        setManifest(m);
        const versions = m.versions
          .filter(v => v.is_major || v.version === m.current_version);
        const sorted = [...versions].reverse();
        setLoadable(sorted);
        if (sorted.length >= 2) {
          setVersionA(sorted[1].version);
          setVersionB(sorted[0].version);
        }
      })
      .catch(() => setFetchError('No versions.json found. Run train.py first.'));
  }, []);

  // Load data when versions change
  useEffect(() => {
    if (!manifest || !versionA || !versionB || versionA === versionB) {
      setDataA(null);
      setDataB(null);
      return;
    }
    const eA = manifest.versions.find(v => v.version === versionA);
    const eB = manifest.versions.find(v => v.version === versionB);
    if (!eA || !eB) return;
    setEntryA(eA);
    setEntryB(eB);

    Promise.all([
      fetch(eA.artifacts.dashboard_data).then(r => r.json()),
      fetch(eB.artifacts.dashboard_data).then(r => r.json()),
    ])
      .then(([dA, dB]) => { setDataA(dA); setDataB(dB); })
      .catch(err => console.error('Failed to load version data:', err));
  }, [manifest, versionA, versionB]);

  const hasComparison = dataA && dataB && entryA && entryB && versionA !== versionB;

  return (
    <>
      <Navigation showSections={false} />
      <main className="wrapper" style={{ maxWidth: 1100 }}>
        <header className="page-header" style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Model Comparison</h1>
          <p className="subtitle">Compare performance across model versions</p>
        </header>

        {fetchError ? (
          <div className="compare-empty">{fetchError}</div>
        ) : (
          <>
            <Selectors
              loadable={loadable}
              versionA={versionA}
              versionB={versionB}
              onChangeA={setVersionA}
              onChangeB={setVersionB}
            />

            {hasComparison ? (
              <>
                <MetricsPanel entryA={entryA} entryB={entryB} dataA={dataA} dataB={dataB} />
                <FeaturesPanel dataA={dataA} dataB={dataB} entryA={entryA} entryB={entryB} />
                <PredictionsPanel dataA={dataA} dataB={dataB} entryA={entryA} entryB={entryB} />
                {manifest && <TimelinePanel manifest={manifest} />}
              </>
            ) : (
              <div className="compare-empty">Select two different versions to compare.</div>
            )}
          </>
        )}
      </main>
    </>
  );
}

/* ---------- Selectors ---------- */
function Selectors({ loadable, versionA, versionB, onChangeA, onChangeB }) {
  const optionLabel = (v) => {
    const vName = v.name ? ` "${v.name}"` : '';
    return `v${v.version}${vName}${v.is_major ? ' ★' : ''} — ${v.dataset_size} tracks`;
  };

  return (
    <div className="compare-selectors">
      <div className="version-pick">
        <label>Version A</label>
        <select value={versionA} onChange={e => onChangeA(e.target.value)}>
          {loadable.map(v => (
            <option key={v.version} value={v.version}>{optionLabel(v)}</option>
          ))}
        </select>
      </div>
      <span className="vs-label">vs</span>
      <div className="version-pick">
        <label>Version B</label>
        <select value={versionB} onChange={e => onChangeB(e.target.value)}>
          {loadable.map(v => (
            <option key={v.version} value={v.version}>{optionLabel(v)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ---------- Performance Metrics ---------- */
function MetricsPanel({ entryA, entryB, dataA, dataB }) {
  return (
    <div className="panel" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
      <h2 style={{
        fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 1rem',
      }}>Model Performance by Type</h2>

      {dataA && dataB ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Ridge Comparison */}
          <div className="metric-card">
            <div className="metric-label">Ridge R²</div>
            <div className="metric-values">
              <div>
                <span className="metric-val">{dataA.models.ridge.r_squared.toFixed(4)}</span>
                <span className="metric-tag">v{entryA.version}</span>
              </div>
              <div>
                <span className="metric-val">{dataB.models.ridge.r_squared.toFixed(4)}</span>
                <span className="metric-tag">v{entryB.version}</span>
              </div>
            </div>
          </div>

          {/* Random Forest Comparison */}
          <div className="metric-card">
            <div className="metric-label">Random Forest R²</div>
            <div className="metric-values">
              <div>
                <span className="metric-val">{dataA.models.random_forest.r_squared.toFixed(4)}</span>
                <span className="metric-tag">v{entryA.version}</span>
              </div>
              <div>
                <span className="metric-val">{dataB.models.random_forest.r_squared.toFixed(4)}</span>
                <span className="metric-tag">v{entryB.version}</span>
              </div>
            </div>
          </div>

          {/* Dataset Info */}
          <div className="metric-card">
            <div className="metric-label">Tracks</div>
            <div className="metric-values">
              <div>
                <span className="metric-val">{dataA.meta.total_tracks}</span>
                <span className="metric-tag">v{entryA.version}</span>
              </div>
              <div>
                <span className="metric-val">{dataB.meta.total_tracks}</span>
                <span className="metric-tag">v{entryB.version}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="metric-card">
            <div className="metric-label">Features</div>
            <div className="metric-values">
              <div>
                <span className="metric-val">{dataA.meta.feature_count}</span>
                <span className="metric-tag">v{entryA.version}</span>
              </div>
              <div>
                <span className="metric-val">{dataB.meta.feature_count}</span>
                <span className="metric-tag">v{entryB.version}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--muted)' }}>Load versions to see metrics...</p>
      )}
    </div>
  );
}

/* ---------- Feature Importance ---------- */
function FeaturesPanel({ dataA, dataB, entryA, entryB }) {
  const makeChartData = (fi) => {
    const top = (fi || []).slice(0, 10);
    return {
      labels: top.map(f => f.feature),
      datasets: [{
        data: top.map(f => f.importance),
        backgroundColor: top.map(f => f.direction === 'positive' ? '#50c878' : '#ff6b6b'),
      }],
    };
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#87a2c3', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d7e6f7', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="panel" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
      <h2 style={{
        fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 1rem',
      }}>Feature Importance</h2>
      <div className="feat-compare">
        <div className="feat-col">
          <h3>v{entryA.version}</h3>
          <Bar data={makeChartData(dataA.feature_importance)} options={chartOptions} />
        </div>
        <div className="feat-col">
          <h3>v{entryB.version}</h3>
          <Bar data={makeChartData(dataB.feature_importance)} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Prediction Differences ---------- */
function PredictionsPanel({ dataA, dataB, entryA, entryB }) {
  const mapA = new Map((dataA.predictions || []).map(p => [`${p.title}|${p.artist}`, p]));
  const mapB = new Map((dataB.predictions || []).map(p => [`${p.title}|${p.artist}`, p]));
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const rows = [];
  for (const key of allKeys) {
    const a = mapA.get(key);
    const b = mapB.get(key);
    const predA = a ? a.predicted : null;
    const predB = b ? b.predicted : null;
    const actual = (a || b).actual;
    const delta = (predA !== null && predB !== null) ? Math.abs(predA - predB) : null;
    const [title, artist] = key.split('|');
    rows.push({ title, artist, actual, predA, predB, delta, onlyA: !b, onlyB: !a });
  }
  rows.sort((a, b) => (b.delta ?? -1) - (a.delta ?? -1));
  const top = rows.slice(0, 20);

  const fmtP = v => v !== null ? v.toFixed(2) : '—';

  return (
    <div className="panel" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
      <h2 style={{
        fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 1rem',
      }}>Prediction Differences</h2>
      <p className="pred-subtitle">
        Tracks with the largest prediction delta between versions, sorted by disagreement.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="pred-table">
          <thead>
            <tr>
              <th>Track</th>
              <th>Artist</th>
              <th>Actual</th>
              <th>v{entryA.version}</th>
              <th>v{entryB.version}</th>
              <th>Delta</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={i}>
                <td>{r.title}</td>
                <td>{r.artist}</td>
                <td>{r.actual}</td>
                <td>{fmtP(r.predA)}</td>
                <td>{fmtP(r.predB)}</td>
                <td className={r.delta && r.delta > 1 ? 'delta-high' : ''}>
                  {r.delta !== null ? r.delta.toFixed(2) : (r.onlyA ? 'A only' : 'B only')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Version Timeline ---------- */
function TimelinePanel({ manifest }) {
  const versions = manifest.versions;
  if (versions.length < 2) return null;

  const labels = versions.map(v => `v${v.version}`);

  const data = {
    labels,
    datasets: [
      {
        label: 'R²',
        data: versions.map(v => v.r_squared),
        borderColor: '#50c878',
        backgroundColor: 'rgba(80,200,120,0.1)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'RMSE',
        data: versions.map(v => v.rmse),
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255,107,107,0.1)',
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#87a2c3' } },
    },
    scales: {
      x: {
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#87a2c3' },
      },
      y: {
        position: 'left',
        title: { display: true, text: 'R²', color: '#50c878' },
        grid: { color: 'rgba(93,155,224,0.1)' },
        ticks: { color: '#50c878' },
      },
      y1: {
        position: 'right',
        title: { display: true, text: 'RMSE', color: '#ff6b6b' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#ff6b6b' },
      },
    },
  };

  return (
    <div className="panel" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
      <h2 style={{
        fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 1rem',
      }}>Version Timeline</h2>
      <div className="timeline-wrap">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
