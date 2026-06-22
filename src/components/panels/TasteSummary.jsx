import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

function SummaryCard({ title, children, accent }) {
  return (
    <div style={{
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '14px',
    }}>
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--muted-2)',
        marginBottom: '6px',
      }}>
        {title}
      </div>
      <div style={{ fontSize: '0.88rem', color: accent || 'var(--text)', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function MoodChip({ mood, variant }) {
  const bg = variant === 'bad'
    ? 'rgba(255,107,107,0.15)'
    : 'rgba(80,200,120,0.15)';
  const color = variant === 'bad' ? 'var(--bad)' : 'var(--good)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '99px',
      background: bg,
      color,
      fontSize: '0.75rem',
      fontWeight: 700,
      margin: '2px',
    }}>
      {mood}
    </span>
  );
}

export default function TasteSummary({ data }) {
  if (!data) return null;
  const ps = data.predictions;
  if (!ps || !ps.length) return null;

  const avgRating = (ps.reduce((s, p) => s + p.actual, 0) / ps.length).toFixed(1);
  const liked = ps.filter(p => p.liked).length;
  const likedPct = Math.round(liked / ps.length * 100);

  // Top moods (from 8+ tracks)
  const moodCounts = {};
  ps.filter(p => p.actual >= 8).forEach(p =>
    (p.moods || []).forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; })
  );
  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);

  // Worst moods (from <=4 tracks)
  const badMoodCounts = {};
  ps.filter(p => p.actual <= 4).forEach(p =>
    (p.moods || []).forEach(m => { badMoodCounts[m] = (badMoodCounts[m] || 0) + 1; })
  );
  const worstMoods = Object.entries(badMoodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(e => e[0]);

  // Top era
  const eraCounts = {};
  ps.forEach(p => {
    const e = p.era || 'Unknown';
    eraCounts[e] = eraCounts[e] || { sum: 0, n: 0 };
    eraCounts[e].sum += p.actual;
    eraCounts[e].n++;
  });
  const topEra = Object.entries(eraCounts)
    .filter(e => e[1].n >= 3)
    .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n))[0];

  // Top artists
  const artistCounts = {};
  ps.forEach(p => {
    const a = p.artist;
    artistCounts[a] = artistCounts[a] || { sum: 0, n: 0 };
    artistCounts[a].sum += p.actual;
    artistCounts[a].n++;
  });
  const topArtists = Object.entries(artistCounts)
    .filter(e => e[1].n >= 2)
    .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n))
    .slice(0, 3);

  // Top instrument
  const instCounts = {};
  ps.forEach(p => {
    const inst = p.primary_instrument || 'unknown';
    instCounts[inst] = instCounts[inst] || { sum: 0, n: 0 };
    instCounts[inst].sum += p.actual;
    instCounts[inst].n++;
  });
  const topInst = Object.entries(instCounts)
    .filter(e => e[1].n >= 3)
    .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n))[0];

  // Biggest surprise (largest positive residual)
  const surprise = [...ps].sort((a, b) => b.residual - a.residual)[0];
  // Biggest disappointment (largest negative residual)

  // Polarity insight
  const highPol = ps.filter(p => (p.mood_polarity || 0) >= 4);
  const lowPol = ps.filter(p => (p.mood_polarity || 0) <= 0);
  const highPolAvg = highPol.length
    ? (highPol.reduce((s, p) => s + p.actual, 0) / highPol.length).toFixed(1)
    : null;
  const lowPolAvg = lowPol.length
    ? (lowPol.reduce((s, p) => s + p.actual, 0) / lowPol.length).toFixed(1)
    : null;

  return (
    <Panel id="taste-summary-panel" span={12}>
      <PanelHeader title="Your Taste at a Glance" note="Auto-generated from your ratings" />
      <p className="panel-insight">
        Across {ps.length} tracks, you gravitate toward {topMoods.length >= 2
          ? `${topMoods[0]} and ${topMoods[1]}`
          : topMoods[0] || 'varied'} sounds{topEra
          ? `, with ${topEra[0]} as your sweet spot era`
          : ''}.
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        <SummaryCard title="Dataset">
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{ps.length}</span> tracks rated<br />
          <span style={{ color: 'var(--good)' }}>{likedPct}%</span> liked &middot; avg <span style={{ fontWeight: 700 }}>{avgRating}</span>/10
        </SummaryCard>

        <SummaryCard title="Sweet Spot">
          {topMoods.map(m => <MoodChip key={m} mood={m} variant="good" />)}
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
            Moods on your 8+ tracks
          </div>
        </SummaryCard>

        <SummaryCard title="Avoid">
          {worstMoods.map(m => <MoodChip key={m} mood={m} variant="bad" />)}
          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--muted)' }}>
            Moods on your &le;4 tracks
          </div>
        </SummaryCard>

        <SummaryCard title="Best Era">
          {topEra ? (
            <>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{topEra[0]}</span>{' '}
              <span style={{ color: 'var(--muted)' }}>
                (avg {(topEra[1].sum / topEra[1].n).toFixed(1)}, {topEra[1].n} tracks)
              </span>
            </>
          ) : '—'}
        </SummaryCard>

        <SummaryCard title="Top Artists">
          {topArtists.map(a => (
            <div key={a[0]}>
              <span style={{ fontWeight: 600 }}>{a[0]}</span>{' '}
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                avg {(a[1].sum / a[1].n).toFixed(1)} ({a[1].n} tracks)
              </span>
            </div>
          ))}
        </SummaryCard>

        <SummaryCard title="Best Lead">
          {topInst ? (
            <>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{topInst[0]}</span>{' '}
              <span style={{ color: 'var(--muted)' }}>
                (avg {(topInst[1].sum / topInst[1].n).toFixed(1)}, {topInst[1].n} tracks)
              </span>
            </>
          ) : '—'}
        </SummaryCard>

        <SummaryCard title="Biggest Surprise">
          {surprise ? (
            <>
              <span style={{ fontWeight: 600 }}>{surprise.title}</span><br />
              <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{surprise.artist}</span><br />
              <span style={{ color: 'var(--good)' }}>
                Predicted {surprise.predicted}, got {surprise.actual}
              </span>
            </>
          ) : '—'}
        </SummaryCard>

        <SummaryCard title="Mood Polarity">
          {highPolAvg && lowPolAvg ? (
            <>
              Positive tracks: avg <span style={{ color: 'var(--good)', fontWeight: 700 }}>{highPolAvg}</span><br />
              Negative tracks: avg <span style={{ color: 'var(--bad)', fontWeight: 700 }}>{lowPolAvg}</span>
            </>
          ) : 'Not enough data'}
        </SummaryCard>
      </div>
    </Panel>
  );
}
