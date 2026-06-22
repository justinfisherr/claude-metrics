export default function PanelHeader({ title, note, children }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {note && <p className="panel-note">{note}</p>}
      </div>
      {children}
    </div>
  );
}
