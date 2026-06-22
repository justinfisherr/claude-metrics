export default function Panel({ id, span = 6, children, hidden }) {
  if (hidden) return null;
  return (
    <article className={`panel span-${span}`} id={id}>
      <div className="panel-inner">
        {children}
      </div>
    </article>
  );
}
