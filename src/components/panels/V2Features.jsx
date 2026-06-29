import { useMemo } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

function StatCard({ title, rows }) {
  return (
    <div style={{
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: 12,
    }}>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--muted)',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          fontSize: '0.82rem',
        }}>
          <span style={{ color: 'var(--text)' }}>{r.label}</span>
          <span style={{ fontWeight: 700, color: r.color || 'var(--accent)' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function V2Features({ data }) {
  const stats = useMemo(() => {
    const ps = data?.predictions || [];
    if (!ps.length || ps[0].artist_is_leader === undefined) return null;

    const leader = ps.filter(p => p.artist_is_leader);
    const sideman = ps.filter(p => !p.artist_is_leader);
    const leaderAvg = leader.length ? (leader.reduce((s, p) => s + p.actual, 0) / leader.length).toFixed(1) : '—';
    const sidemanAvg = sideman.length ? (sideman.reduce((s, p) => s + p.actual, 0) / sideman.length).toFixed(1) : '—';

    const intro = ps.filter(p => p.intro_grabbed);
    const noIntro = ps.filter(p => !p.intro_grabbed);
    const introAvg = intro.length ? (intro.reduce((s, p) => s + p.actual, 0) / intro.length).toFixed(1) : '—';
    const noIntroAvg = noIntro.length ? (noIntro.reduce((s, p) => s + p.actual, 0) / noIntro.length).toFixed(1) : '—';

    const bail = ps.filter(p => p.early_bail);
    const noBail = ps.filter(p => !p.early_bail);
    const bailAvg = bail.length ? (bail.reduce((s, p) => s + p.actual, 0) / bail.length).toFixed(1) : '—';
    const noBailAvg = noBail.length ? (noBail.reduce((s, p) => s + p.actual, 0) / noBail.length).toFixed(1) : '—';

    return {
      artistRole: [
        { label: `As leader (${leader.length})`, value: `avg ${leaderAvg}`, color: '' },
        { label: `As sideman (${sideman.length})`, value: `avg ${sidemanAvg}`, color: '' },
      ],
      introGrab: [
        { label: `Grabbed (${intro.length})`, value: `avg ${introAvg}`, color: 'var(--good)' },
        { label: `No grab (${noIntro.length})`, value: `avg ${noIntroAvg}`, color: '' },
      ],
      earlyBail: [
        { label: `Bailed (${bail.length})`, value: `avg ${bailAvg}`, color: 'var(--bad)' },
        { label: `Stayed (${noBail.length})`, value: `avg ${noBailAvg}`, color: '' },
      ],
    };
  }, [data]);

  if (!data || !stats) return null;

  return (
    <Panel id="v2features-panel" span={6}>
      <PanelHeader title="v2 Feature Breakdown" note="Artist role, intro grab, early bail" />
      {(() => {
        const ps2 = data?.predictions || [];
        const intro = ps2.filter(p => p.intro_grabbed);
        const noIntro = ps2.filter(p => !p.intro_grabbed);
        const bail = ps2.filter(p => p.early_bail);
        const introAvg = intro.length ? (intro.reduce((s, p) => s + p.actual, 0) / intro.length).toFixed(1) : null;
        const noIntroAvg = noIntro.length ? (noIntro.reduce((s, p) => s + p.actual, 0) / noIntro.length).toFixed(1) : null;
        const bailAvg = bail.length ? (bail.reduce((s, p) => s + p.actual, 0) / bail.length).toFixed(1) : null;
        if (!introAvg || !noIntroAvg) return null;
        const introObs = parseFloat(introAvg) - parseFloat(noIntroAvg) > 1
          ? 'First impressions matter for you.'
          : 'Slow burners hold their own in your ratings.';
        return (
          <p className="panel-insight">
            Tracks that grabbed you from the intro average {introAvg} vs {noIntroAvg} for slow burners. {introObs}{bailAvg ? ` Early bails average ${bailAvg} — when you leave before 30%, you mean it.` : ''}
          </p>
        );
      })()}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <StatCard title="Artist Role" rows={stats.artistRole} />
        <StatCard title="Intro Grab" rows={stats.introGrab} />
        <StatCard title="Early Bail (<30%)" rows={stats.earlyBail} />
      </div>
    </Panel>
  );
}
