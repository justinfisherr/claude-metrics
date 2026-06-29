import { useState } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function Changelog() {
  const { manifest } = useDashboardData();
  const [selectedVersion, setSelectedVersion] = useState(null);

  if (!manifest || !manifest.versions.length) return null;

  const majors = manifest.versions.filter(v => v.is_major).reverse();
  const active = selectedVersion
    ? majors.find(v => v.version === selectedVersion)
    : majors[0];

  return (
    <Panel id="changelog-panel" span={12}>
      <PanelHeader title="Version History" note="Major releases and what changed" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <select
          className="version-select"
          style={{ maxWidth: 260 }}
          value={active?.version || ''}
          onChange={e => setSelectedVersion(e.target.value)}
        >
          {majors.map(v => (
            <option key={v.version} value={v.version}>
              v{v.version}{v.name ? ` "${v.name}"` : ''} — {new Date(v.run_date).toLocaleDateString()}
            </option>
          ))}
        </select>
        {active && (
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-2)' }}>
            {active.dataset_size} tracks · {active.feature_count} features · R² {active.r_squared.toFixed(3)}
          </span>
        )}
      </div>

      {active && (
        <div style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>
              v{active.version}
            </span>
            {active.name && (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                "{active.name}"
              </span>
            )}
          </div>
          {active.notes && (
            <p style={{ fontSize: '0.83rem', color: 'var(--muted)', margin: '0 0 10px', fontStyle: 'italic' }}>
              {active.notes}
            </p>
          )}
          {active.changelog && active.changelog.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.8 }}>
              {active.changelog.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : !active.notes ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-2)', margin: 0 }}>Initial release</p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
