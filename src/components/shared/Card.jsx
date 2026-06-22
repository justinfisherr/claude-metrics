export default function Card({ title, content, accent }) {
  return (
    <div style={{
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '14px',
    }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '6px'
      }}>{title}</div>
      <div style={{ fontSize: '0.88rem', color: accent || 'var(--text)', lineHeight: 1.5 }}>
        {content}
      </div>
    </div>
  );
}
