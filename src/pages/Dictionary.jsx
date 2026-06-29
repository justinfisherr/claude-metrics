import { useState, useRef, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import Navigation from '../components/shared/Navigation';
import '../styles/dictionary.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

// ─── Shared chart defaults ────────────────────────────────────────────────────

const DARK = {
  grid: 'rgba(93,155,224,0.08)',
  tick: '#87a2c3',
  bg: '#0d1c30',
  border: 'rgba(93,155,224,0.2)',
};

function miniOpts(xLabel, yLabel, yMax) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0d1c30', borderColor: DARK.border, borderWidth: 1, titleColor: '#fff', bodyColor: DARK.tick } },
    scales: {
      x: { grid: { display: false }, ticks: { color: DARK.tick, font: { size: 9 } }, title: xLabel ? { display: true, text: xLabel, color: DARK.tick, font: { size: 9 } } : undefined },
      y: { grid: { color: DARK.grid }, ticks: { color: DARK.tick, font: { size: 9 } }, max: yMax, title: yLabel ? { display: true, text: yLabel, color: DARK.tick, font: { size: 9 } } : undefined },
    },
  };
}

// ─── Concept visualizations ───────────────────────────────────────────────────

function RSquaredViz() {
  const songs = ['A', 'B', 'C', 'D', 'E'];
  const actual = [9, 8, 7, 4, 2];
  const dumb   = [6, 6, 6, 6, 6];
  const model  = [8.1, 7.4, 6.8, 4.6, 2.9];

  const barConfig = (data, color, label) => ({
    labels: songs,
    datasets: [
      { label: 'Actual', data: actual, backgroundColor: 'rgba(93,155,224,0.25)', borderColor: 'rgba(93,155,224,0.6)', borderWidth: 1, borderRadius: 3 },
      { label, data, backgroundColor: color + 'cc', borderColor: color, borderWidth: 1, borderRadius: 3 },
    ],
  });

  const opts = { ...miniOpts('Song', 'Rating', 10), plugins: { ...miniOpts().plugins, legend: { display: true, labels: { color: DARK.tick, font: { size: 8 }, boxWidth: 10, padding: 6 } } } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dumb model — R² ≈ 0</p>
        <div style={{ height: 140 }}><Bar data={barConfig(dumb, '#ff6b6b', 'Predicted')} options={opts} /></div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>Predicts your average (6) every time. Knows nothing.</p>
      </div>
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your model — R² ≈ 0.25</p>
        <div style={{ height: 140 }}><Bar data={barConfig(model, '#50c878', 'Predicted')} options={opts} /></div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>Not perfect — but knows your highs from your lows.</p>
      </div>
    </div>
  );
}

function ErrorViz() {
  const songs = ['A', 'B', 'C', 'D', 'E'];
  const actual   = [9, 8, 7, 4, 2];
  const predicted = [7.5, 7.8, 6.5, 5.5, 3.5];
  const absErrors = actual.map((a, i) => Math.abs(a - predicted[i]));
  const squaredErrors = actual.map((a, i) => (a - predicted[i]) ** 2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Absolute errors (MAE)</p>
        <div style={{ height: 130 }}>
          <Bar data={{ labels: songs, datasets: [{ data: absErrors, backgroundColor: '#ffc832cc', borderColor: '#ffc832', borderWidth: 1, borderRadius: 3 }] }} options={miniOpts('Song', 'Error', 4)} />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>MAE = {(absErrors.reduce((s,e)=>s+e,0)/absErrors.length).toFixed(2)} — the average miss, in points</p>
      </div>
      <div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Squared errors (RMSE)</p>
        <div style={{ height: 130 }}>
          <Bar data={{ labels: songs, datasets: [{ data: squaredErrors, backgroundColor: '#ff6b6bcc', borderColor: '#ff6b6b', borderWidth: 1, borderRadius: 3 }] }} options={miniOpts('Song', 'Error²', 6)} />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>Big misses explode. RMSE = {Math.sqrt(squaredErrors.reduce((s,e)=>s+e,0)/squaredErrors.length).toFixed(2)} — punishes outliers harder</p>
      </div>
    </div>
  );
}

function BayesViz() {
  const k = 15;
  const globalMean = 6.0;
  const trueMean = 8.5; // a musician you love
  const ns = [1, 2, 3, 5, 8, 12, 15, 20, 30, 50];
  const bayesRatings = ns.map(n => (n / (n + k)) * trueMean + (k / (n + k)) * globalMean);

  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        A musician whose true avg is 8.5 — how confidence grows with more tracks
      </p>
      <div style={{ height: 150 }}>
        <Line
          data={{
            labels: ns,
            datasets: [
              {
                label: 'Bayesian rating',
                data: bayesRatings,
                borderColor: '#50c878',
                backgroundColor: 'rgba(80,200,120,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#50c878',
              },
              {
                label: 'True mean (8.5)',
                data: ns.map(() => trueMean),
                borderColor: 'rgba(93,155,224,0.4)',
                borderDash: [4, 4],
                pointRadius: 0,
              },
              {
                label: 'Global mean (6.0)',
                data: ns.map(() => globalMean),
                borderColor: 'rgba(255,107,107,0.4)',
                borderDash: [4, 4],
                pointRadius: 0,
              },
            ],
          }}
          options={{
            ...miniOpts('Tracks rated', 'Rating', 10),
            plugins: {
              legend: { display: true, labels: { color: DARK.tick, font: { size: 8 }, boxWidth: 10, padding: 6 } },
              tooltip: { backgroundColor: '#0d1c30', borderColor: DARK.border, borderWidth: 1, titleColor: '#fff', bodyColor: DARK.tick },
            },
          }}
        />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>
        With 1 track: rating pulled toward 6.0 (global). By ~20 tracks: you've earned the 8.5. k=15.
      </p>
    </div>
  );
}

function FeatureStrengthViz() {
  const features = ['collaborators', 'artist×era', 'recency', 'mood zones', 'subgenre', 'label×decade', 'missingness'];
  const deltas = [0.109, 0.063, 0.014, 0.008, 0.005, 0.003, 0.001];
  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        ΔR² when each feature group is removed (ablation study)
      </p>
      <div style={{ height: 160 }}>
        <Bar
          data={{
            labels: features,
            datasets: [{
              data: deltas,
              backgroundColor: deltas.map(d => d > 0.05 ? '#50c878cc' : d > 0.01 ? '#ffc832cc' : '#ff6b6b66'),
              borderColor: deltas.map(d => d > 0.05 ? '#50c878' : d > 0.01 ? '#ffc832' : '#ff6b6b'),
              borderWidth: 1, borderRadius: 3,
            }],
          }}
          options={{
            ...miniOpts(null, 'ΔR²'),
            indexAxis: 'y',
            scales: {
              x: { grid: { color: DARK.grid }, ticks: { color: DARK.tick, font: { size: 9 } } },
              y: { grid: { display: false }, ticks: { color: '#d7e6f7', font: { size: 9 } } },
            },
          }}
        />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '6px' }}>
        Green = matters a lot. Remove collaborators and R² drops by 0.109. Remove missingness indicators and almost nothing changes.
      </p>
    </div>
  );
}

// ─── Concept card ─────────────────────────────────────────────────────────────

function ConceptCard({ concept, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="concept-card">
      <button className="concept-toggle" onClick={() => setOpen(v => !v)}>
        <div>
          <span className="concept-name">{concept.name}</span>
          <span className={`concept-tag tag-${concept.tag}`}>{concept.tag}</span>
        </div>
        <span className="concept-chevron">{open ? '▲' : '▼'}</span>
      </button>
      <div className="concept-hook">{concept.hook}</div>
      {open && (
        <div className="concept-body">
          {concept.body}
          {concept.viz && <div className="concept-viz">{concept.viz}</div>}
          {concept.insight && (
            <div className="concept-insight">
              <strong>In your model:</strong> {concept.insight}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VS Card ─────────────────────────────────────────────────────────────────

function VSCard() {
  return (
    <div className="vs-card">
      <div className="vs-header">Ridge Regression <span className="vs-badge">VS</span> Random Forest</div>
      <div className="vs-grid">
        <div className="vs-side vs-ridge">
          <div className="vs-algo-name">Ridge Regression</div>
          <div className="vs-algo-sub">The scientist with a spreadsheet</div>
          <p className="vs-desc">
            Ridge draws the single best straight line through your data. For every feature — energy, tempo, artist mean rating — it finds a weight. A track with energy 8 gets +0.3 points. A track with a favorite artist gets +1.2 points. It's completely transparent.
          </p>
          <div className="vs-pros">
            <div className="vs-pro">✓ Explainable — you can see exactly why it predicted 7.2</div>
            <div className="vs-pro">✓ Great with sparse features (one-hot encoded eras, labels)</div>
            <div className="vs-pro">✓ Stable — small data changes don't wildly flip predictions</div>
          </div>
          <div className="vs-cons">
            <div className="vs-con">✗ Thinks in straight lines — can't learn "I like hard bop, but only at medium energy"</div>
            <div className="vs-con">✗ Misses interactions between features</div>
          </div>
        </div>
        <div className="vs-divider">
          <div className="vs-divider-line" />
          <div className="vs-vs-text">VS</div>
          <div className="vs-divider-line" />
        </div>
        <div className="vs-side vs-rf">
          <div className="vs-algo-name">Random Forest</div>
          <div className="vs-algo-sub">A democracy of decision trees</div>
          <p className="vs-desc">
            Random Forest builds hundreds of decision trees — each one asks a different sequence of yes/no questions. "Energy above 7? → Is it modal era? → Does it have piano?" Each tree votes, and the majority wins. It can learn complex, conditional rules.
          </p>
          <div className="vs-pros">
            <div className="vs-pro">✓ Captures interactions — can learn "ballad + piano + 1960s = probably 8+"</div>
            <div className="vs-pro">✓ Naturally handles non-linear relationships</div>
            <div className="vs-pro">✓ Robust to outliers</div>
          </div>
          <div className="vs-cons">
            <div className="vs-con">✗ Black box — hard to say why it predicted exactly 6.4</div>
            <div className="vs-con">✗ Needs more data to find reliable patterns</div>
          </div>
        </div>
      </div>
      <div className="vs-footer">
        <div className="vs-footer-title">Why you run both</div>
        <div className="vs-footer-grid">
          <div className="vs-footer-item">
            <span style={{ color: '#50c878' }}>●</span> Ridge and RF <strong>agree</strong> → high confidence prediction
          </div>
          <div className="vs-footer-item">
            <span style={{ color: '#ffc832' }}>●</span> Ridge and RF <strong>disagree by &gt;0.8pts</strong> → model is uncertain — that track is a good candidate to explore
          </div>
          <div className="vs-footer-item">
            <span style={{ color: '#87a2c3' }}>●</span> RF scores <strong>higher</strong> → interaction effects (collaborators + era + mood working together)
          </div>
          <div className="vs-footer-item">
            <span style={{ color: '#a78bfa' }}>●</span> Ridge scores <strong>higher</strong> → linear features dominating (strong artist signal, clear era preference)
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Concepts data ────────────────────────────────────────────────────────────

const MODEL_CONCEPTS = [
  {
    name: 'R² — Does the model know anything?',
    tag: 'accuracy',
    hook: 'The single most important number in the model. It answers: "Can the model explain why your ratings vary — or is it just guessing?"',
    body: (
      <>
        <p>Suppose you rated five songs: <strong style={{color:'#fff'}}>A=9, B=8, C=7, D=4, E=2</strong>. Your ratings clearly vary. The question R² asks is: <em>can the model explain that variation?</em></p>
        <div className="concept-callout">
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ff6b6b'}}>R² = 0</span>
            <span className="callout-text">The model predicts 6, 6, 6, 6, 6 — your average, every time. It has no idea. It's just saying "you probably gave it a 6."</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#50c878'}}>R² = 1</span>
            <span className="callout-text">Perfect prediction. 9, 8, 7, 4, 2 — exactly right. The model completely understands your taste.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#87a2c3'}}>R² = 0.25</span>
            <span className="callout-text">Your model, roughly. It knows more than a lucky guess, but taste is hard. 25% of the variation explained. Respectable for a dataset this small.</span>
          </div>
        </div>
      </>
    ),
    viz: <RSquaredViz />,
    insight: 'Your current model runs around R²=0.25. That\'s not "bad" — jazz taste has enormous variance even within your own preferences. A song can be a 9 or a 3 based on subtle things no feature fully captures.',
  },
  {
    name: 'MAE — How wrong is the model, on average?',
    tag: 'accuracy',
    hook: 'If the model guesses 7 and you gave it a 5, that\'s an error of 2. MAE is the average of all those errors. Simple, honest, easy to interpret.',
    body: (
      <>
        <p>MAE stands for <strong style={{color:'#fff'}}>Mean Absolute Error</strong>. Every prediction the model makes gets a "penalty" equal to how far off it was. MAE is just the average penalty.</p>
        <p>If MAE = 1.2, the model is off by <strong style={{color:'#ffc832'}}>1.2 rating points on average</strong>. On a 10-point scale, that's meaningful but not catastrophic. You'd still use it to distinguish an 8 from a 4.</p>
        <p>The nice thing about MAE: a miss of 3 points costs exactly 3x as much as a miss of 1 point. No drama. No harsh punishment for being very wrong. Treat all errors proportionally.</p>
      </>
    ),
    insight: 'Your model\'s MAE is typically around 1.3–1.6. Roughly: if it predicts 7, the real rating is somewhere between 5.5 and 8.5.',
  },
  {
    name: 'RMSE — The same, but catastrophic misses cost more',
    tag: 'accuracy',
    hook: 'Like MAE, but it squares the errors first. A miss of 4 doesn\'t cost 4 — it costs 16. This makes RMSE hypersensitive to big mistakes.',
    body: (
      <>
        <p>RMSE = <strong style={{color:'#fff'}}>Root Mean Squared Error</strong>. Same idea as MAE, but first you square each error, average those, then take the square root.</p>
        <p>The effect: <strong style={{color:'#ff6b6b'}}>being very wrong once is much worse than being slightly wrong many times</strong>.</p>
        <div className="concept-callout">
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ffc832'}}>Student A</span>
            <span className="callout-text">Off by 1 point on 4 songs. MAE = 1.0. RMSE = 1.0.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ff6b6b'}}>Student B</span>
            <span className="callout-text">Nails 3 songs (0 error) but catastrophically wrong on 1 (4 pts off). MAE = 1.0. RMSE = 2.0.</span>
          </div>
        </div>
        <p>Same average miss — but RMSE knows Student B had a meltdown. That matters in your model because a track predicted as a 3 that you actually rate a 9 (or vice versa) is a genuine failure mode worth knowing about.</p>
      </>
    ),
    viz: <ErrorViz />,
    insight: 'When RMSE is significantly higher than MAE in your model, it means there are a few "catastrophic misses" — tracks the model confidently got backwards. The Biggest Misses panel shows exactly these.',
  },
  {
    name: 'Feature Strength — What actually moves the needle?',
    tag: 'model internals',
    hook: 'Not all features are created equal. Some predict your ratings almost perfectly. Others are pure noise. Feature importance tells you which is which.',
    body: (
      <>
        <p>During training, the model asks: <em>"If I remove this feature, does my R² drop?"</em> The more it drops, the more important the feature.</p>
        <p>This is called an <strong style={{color:'#fff'}}>ablation study</strong> — you systematically remove one thing at a time and measure what breaks.</p>
        <div className="concept-callout">
          <div className="callout-row">
            <span className="callout-label" style={{color:'#50c878'}}>Strong</span>
            <span className="callout-text">Collaborator features (ΔR²=−0.109). Who you play with predicts whether I'll like it more than almost anything.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ffc832'}}>Moderate</span>
            <span className="callout-text">Artist×Era (ΔR²=−0.063). Miles Davis in 1959 vs 1970 — very different predictions.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ff6b6b'}}>Weak</span>
            <span className="callout-text">Missingness indicators (ΔR²=−0.001). Whether a field was missing tells you almost nothing useful.</span>
          </div>
        </div>
      </>
    ),
    viz: <FeatureStrengthViz />,
    insight: 'This is why the Collaborator Network matters so much — it\'s the strongest predictive signal in the entire dataset. Knowing who played together predicts your rating better than tempo, era, or even the artist\'s general reputation.',
  },
];

const NORMALIZATION_CONCEPTS = [
  {
    name: 'Normalization — Making features speak the same language',
    tag: 'data prep',
    hook: 'Energy is scored 1–10. Year is 1935–2024. Popularity is 0–100. Mix these raw into a model and it\'ll think Year matters 10x more than Energy just because the numbers are bigger.',
    body: (
      <>
        <p>Normalization is the process of rescaling features so they\'re on <strong style={{color:'#fff'}}>comparable scales</strong>. Without it, large-numbered features dominate the model not because they\'re more important, but because they're louder.</p>

        <div className="concept-callout">
          <div className="callout-row">
            <span className="callout-label" style={{color:'#87a2c3'}}>Min-Max</span>
            <span className="callout-text">Squash everything to 0–1. Year 1959 becomes (1959−1935)/(2024−1935) ≈ 0.27. Simple, but sensitive to outliers.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#a78bfa'}}>Z-score</span>
            <span className="callout-text">How many standard deviations from the mean? A track from 1959 is maybe −1.2σ from the average year in the dataset. Outlier-resistant, used in your model.</span>
          </div>
        </div>

        <p>Your model normalizes all continuous features before training. This means Ridge Regression weights reflect <em>actual importance</em>, not just scale.</p>
      </>
    ),
    insight: 'Normalization is invisible when it works correctly — you never notice it. But skip it and your model will care about release year 20× more than energy, just because years are in the 1900s and energy is in the 1s.',
  },
  {
    name: 'Bayesian Smoothing — Don\'t trust small samples',
    tag: 'data prep',
    hook: 'You\'ve heard Miles Davis 12 times. You\'ve heard Herbie Hancock once, and it was a 10/10. Should the model treat Herbie as a 10/10 artist? No — and here\'s why.',
    body: (
      <>
        <p>When you have very few data points, the sample mean is unreliable. One incredible track doesn't mean an artist is always incredible. One bad track doesn't mean they're always bad.</p>

        <p>Bayesian smoothing solves this by <strong style={{color:'#fff'}}>blending the sample mean with the global mean</strong> — weighted by how much data you have.</p>

        <div className="concept-callout" style={{fontFamily:'monospace', fontSize:'0.82rem'}}>
          <div style={{color:'#87a2c3', marginBottom:'0.4rem'}}>Bayesian Rating =</div>
          <div style={{color:'#fff', marginBottom:'0.3rem'}}>
            <span style={{color:'#50c878'}}>(n / (n + k))</span> × sample_mean
          </div>
          <div style={{color:'#fff', marginBottom:'0.8rem'}}>
            + <span style={{color:'#ffc832'}}>(k / (n + k))</span> × global_mean
          </div>
          <div style={{color:'var(--muted)', fontSize:'0.75rem'}}>n = tracks you've rated · k = 15 (confidence constant) · global_mean ≈ 6.0</div>
        </div>

        <div className="concept-callout">
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ff6b6b'}}>1 track, 10/10</span>
            <span className="callout-text">(1/16) × 10 + (15/16) × 6 = <strong>6.25</strong>. The model isn't impressed yet. You need more evidence.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#ffc832'}}>5 tracks, 10/10 avg</span>
            <span className="callout-text">(5/20) × 10 + (15/20) × 6 = <strong>7.0</strong>. Getting interesting.</span>
          </div>
          <div className="callout-row">
            <span className="callout-label" style={{color:'#50c878'}}>20 tracks, 10/10 avg</span>
            <span className="callout-text">(20/35) × 10 + (15/35) × 6 = <strong>8.29</strong>. Now the model believes you.</span>
          </div>
        </div>

        <p>k=15 means you need roughly <strong style={{color:'#fff'}}>15 tracks</strong> before your sample mean "takes over" from the global mean. It's the same formula IMDb uses for their movie rankings.</p>
      </>
    ),
    viz: <BayesViz />,
    insight: 'Every artist mean rating in your model is Bayesian-smoothed. That\'s why Paul Chambers (9 tracks, avg 7.6) has a higher Bayesian score than a musician you\'ve heard once at 9/10 — consistency beats one great night.',
  },
];

// ─── Taste vocabulary (kept from original) ────────────────────────────────────

const POSITIVE_SIGNALS = [
  { name: 'Sexy / Sensual', signal: 'Strongest positive', signalClass: 'signal-positive', def: 'A track that feels intimate, seductive, and emotionally charged in a physical way. Not just pretty — it has heat. The quality of making you lean in, not sit back. Often paired with tender sax playing, slow tempos, and dark harmonic color.', examples: 'God Bless the Child (10) — "super sexy, the sax playing is tender." Equinox (8.5) — "very bluesy, moody, sexy." Tryin\'s Times (9) — "sexy as hell." Goodbye Pork Pie Hat (10) — "sexy and mournfully romantic."', quote: '"Sensual" mood tags average 9.4/10 — the highest of any mood in the dataset.' },
  { name: 'Fuck-You Attitude', signal: 'Strong positive', signalClass: 'signal-positive', def: 'An unhurried, self-assured coolness. The track sounds like the musician doesn\'t care whether you\'re listening — they\'re playing for themselves. Not aggressive, but effortlessly confident. The opposite of trying to impress.', examples: 'So What (10) — the archetypal cool. St. Thomas (8) — "cool in a similar way to So What." Equinox (8.5) — "fuck-you unhurried attitude."', quote: 'Tracks with this quality never rate below 7.5. The most reliable positive signal in the dataset.' },
  { name: 'Romantic / Tender', signal: 'Core preference', signalClass: 'signal-positive', def: 'Emotionally open and vulnerable music that conveys love, longing, or deep affection. Not saccharine — it has weight. Often involves muted trumpet, lyrical sax, or intimate piano.', examples: 'Love Theme from Spartacus (10) — "so romantic." It Never Entered My Mind (9) — "pretty, romantic." Naima (8) — "beautiful."', quote: '"Romantic" appears in 15 tracks. Necessary, not sufficient — a romantic track can still miss if it drags.' },
  { name: 'Communal / Celebratory', signal: '10/10 territory', signalClass: 'signal-positive', def: 'High-energy music that feels like a group celebration. Gospel-tinged, joyful, inclusive. The energy is shared between players, not directed at an audience.', examples: 'Better Git It in Your Soul (10) — "like Moanin\' but somehow more dynamic." Moanin\'/Mingus Big Band (9) — "high passion, high energy but in a fun way."', quote: 'Both communal/celebratory tracks are rated 9+. One of only two paths to a perfect 10.' },
  { name: 'Bittersweet', signal: 'Strong positive', signalClass: 'signal-positive', def: 'Sad but not defeated. Music that holds sorrow and hope simultaneously. Not tragic (too heavy). Not melancholic (too passive). Bittersweet is active sadness with beauty in it.', examples: 'Peace Piece (9) — "bittersweet feeling." Infant Eyes (7.5) — "tender and mysterious."', quote: 'Dorian mode tracks average 10.0. Bittersweet is the sound of your emotional center.' },
  { name: 'Structural Variety', signal: 'Engagement signal', signalClass: 'signal-positive', def: 'When a track has distinct sections, shifts, or surprises that prevent monotony. Mode switches, tempo changes, unexpected entries. Keeps the ear interested.', examples: 'Blue Train (8) — "3 different sections — loved the structural variety." Open Letter to Duke (8) — "nice surprise with a beautiful back half."', quote: null },
  { name: 'Never Gets Tired of It', signal: 'Max replayability', signalClass: 'signal-positive', def: 'A track with infinite replay value. Works every time, in every mood, reveals something new on each listen.', examples: 'My Favorite Things (10) — "never gets tired of it." Love Theme from Spartacus (10) — same. Tezeta (9) — "every time it ends, wants to listen again."', quote: null },
];

const NEGATIVE_SIGNALS = [
  { name: 'Flat / Forgettable', signal: 'Strongest negative', signalClass: 'signal-negative', def: 'Not bad — invisible. It plays and nothing happens inside. No emotional response, no moment worth remembering. Often the result of missing melodic identity or emotional specificity.', examples: 'John S. (3) — "not great, a little flat." Circle (3) — "forgettable."', quote: '"Flat" is the opposite of everything you value. It\'s not that the music is technically bad — it has no identity.' },
  { name: 'Corny', signal: 'Floor-level negative', signalClass: 'signal-negative', def: 'Performed emotion instead of felt emotion. The gap between the intent and the delivery is audible. Saccharine, forced sincerity, clichéd emotional beats.', examples: 'That Old Feeling (2) — "felt corny. New lowest rating in the dataset."', quote: '"Corny" produced the lowest rating in the entire dataset. The anti-authenticity signal.' },
  { name: 'Showtimey', signal: 'Performance penalty', signalClass: 'signal-negative', def: 'Virtuosity for display rather than expression. Technical fireworks directed at an audience rather than emerging from the composition.', examples: 'Moment\'s Notice (6) — "felt a little showtimey." The opposite of "fuck-you attitude."', quote: null },
  { name: 'Drags On / Sleepy', signal: 'Pacing failure', signalClass: 'signal-negative', def: 'When a track loses momentum and can\'t sustain its emotional idea across its runtime. Not the same as "slow" — slow tracks can be riveting. Dragging is when slowness becomes empty.', examples: 'Blue in Green (8) — "kinda drags on." Laura (5) — "almost lulls me to sleep."', quote: 'Tracks under 7 minutes are safer. Structural variety is the antidote.' },
  { name: 'Solo Show', signal: 'Ensemble failure', signalClass: 'signal-negative', def: 'When a track feels like one musician performing and everyone else backing them up. The opposite of communal.', examples: 'Parker\'s Mood (3) — "seems like a solo show."', quote: null },
  { name: 'Too Tragic', signal: 'Emotional overload', signalClass: 'signal-negative', def: 'Tragedy without hope, sorrow without beauty, darkness without a crack of light. The distinction from "bittersweet" is whether there\'s something to hold onto.', examples: 'Alabama (6) — "a little too tragic — no sense of optimism."', quote: null },
];

const CONTEXTUAL_SIGNALS = [
  { name: 'Cool', signal: 'Amplifier', signalClass: 'signal-context', def: 'An effortless confidence that makes you feel cooler just listening. Related to "fuck-you attitude" but lighter. Cool is the swagger; fuck-you is the commitment.', examples: 'Early Summer (7) — "very cool." Strode Rode (8) — "really cool."', quote: null },
  { name: 'Fun', signal: 'Amplifier', signalClass: 'signal-context', def: 'Genuinely enjoyable to listen to. Not profound, not challenging, just a good time. Often associated with groove, playfulness, and accessible energy.', examples: 'Tezeta (9) — "very fun." Fables of Faubus (7.5) — "another fun one."', quote: null },
  { name: 'Predictable', signal: 'Replay killer', signalClass: 'signal-context', def: 'When you know where a track is going before it gets there. A track can be good on first listen but predictable on second. Tanks replayability more than rating.', examples: 'Song for My Father (5) — "a little predictable to come back to."', quote: null },
  { name: 'Grows On You', signal: 'Slow burn', signalClass: 'signal-context', def: 'Tracks that don\'t land immediately but reveal themselves over time. Back-loaded tracks that reward patience.', examples: 'Strode Rode (8) — "at first didn\'t like it but when the drum breaks came in — that was sick."', quote: null },
];

function AttrCard({ attr }) {
  return (
    <div className="attr-card">
      <div className="attr-header">
        <span className="attr-name">{attr.name}</span>
        <span className={`attr-signal ${attr.signalClass}`}>{attr.signal}</span>
      </div>
      <div className="attr-def">{attr.def}</div>
      <div className="attr-examples"><strong>Examples:</strong> {attr.examples}</div>
      {attr.quote && <div className="attr-quote">{attr.quote}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dictionary() {
  const [tab, setTab] = useState('model');

  return (
    <>
      <Navigation showSections={false} />
      <div className="dictionary-wrapper">
        <div className="dictionary-header">
          <p className="eyebrow">Jazz Taste Model</p>
          <h1>Field Guide</h1>
          <p className="subtitle">
            How the model works — and what your taste actually looks like from the inside.
          </p>
        </div>

        <div className="dict-tabs">
          <button className={`dict-tab ${tab === 'model' ? 'active' : ''}`} onClick={() => setTab('model')}>
            How the Model Works
          </button>
          <button className={`dict-tab ${tab === 'taste' ? 'active' : ''}`} onClick={() => setTab('taste')}>
            Taste Vocabulary
          </button>
        </div>

        {tab === 'model' && (
          <>
            <div className="dict-section">
              <h2>Measuring Performance</h2>
              {MODEL_CONCEPTS.map(c => <ConceptCard key={c.name} concept={c} />)}
            </div>

            <div className="dict-section">
              <h2>The Algorithms</h2>
              <VSCard />
            </div>

            <div className="dict-section">
              <h2>How the Data Gets Prepared</h2>
              {NORMALIZATION_CONCEPTS.map(c => <ConceptCard key={c.name} concept={c} />)}
            </div>
          </>
        )}

        {tab === 'taste' && (
          <>
            <div className="dict-section">
              <h2>Positive Signals — What Makes a Track Land</h2>
              {POSITIVE_SIGNALS.map(attr => <AttrCard key={attr.name} attr={attr} />)}
            </div>
            <div className="dict-section">
              <h2>Negative Signals — What Kills a Track</h2>
              {NEGATIVE_SIGNALS.map(attr => <AttrCard key={attr.name} attr={attr} />)}
            </div>
            <div className="dict-section">
              <h2>Contextual Signals — Modifiers That Shape the Rating</h2>
              {CONTEXTUAL_SIGNALS.map(attr => <AttrCard key={attr.name} attr={attr} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
