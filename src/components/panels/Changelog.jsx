import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function Changelog() {
  const { manifest } = useDashboardData();

  if (!manifest || !manifest.versions.length) return null;

  const majors = manifest.versions.filter(v => v.is_major).reverse();
  const latest = manifest.versions[manifest.versions.length - 1];

  return (
    <Panel id="changelog-panel" span={12}>
      <PanelHeader title="Version History" note="Major releases and what changed" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {majors.map(v => (
          <div key={v.version} style={{
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>
                  v{v.version}
                </span>
                {v.name && (
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginLeft: '8px' }}>
                    "{v.name}"
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-2)' }}>
                {new Date(v.run_date).toLocaleDateString()} · {v.dataset_size} tracks · {v.feature_count} features · R² {v.r_squared.toFixed(3)}
              </div>
            </div>
            {v.notes && (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 6px', fontStyle: 'italic' }}>
                {v.notes}
              </p>
            )}
            {v.changelog && v.changelog.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.7 }}>
                {v.changelog.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {(!v.changelog || v.changelog.length === 0) && !v.notes && (
              <p style={{ fontSize: '0.78rem', color: 'var(--muted-2)', margin: 0 }}>Initial release</p>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
