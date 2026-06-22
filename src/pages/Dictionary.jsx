import Navigation from '../components/shared/Navigation';

export default function Dictionary() {
  return (
    <>
      <Navigation showSections={false} />
      <main className="wrapper">
        <header className="page-header">
          <h1>Attribute Dictionary</h1>
          <p className="subtitle">Dictionary page — migrating from dictionary.html</p>
        </header>
      </main>
    </>
  );
}
