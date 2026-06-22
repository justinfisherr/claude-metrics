import { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
    fetch('versions.json')
      .then(r => r.ok ? r.json() : null)
      .then(m => {
        if (m && m.versions.length) {
          setManifest(m);
          setCurrentVersion(m.current_version);
          const entry = m.versions.find(v => v.version === m.current_version);
          return fetch(entry ? entry.artifacts.dashboard_data : 'dashboard-data.json');
        }
        return fetch('dashboard-data.json');
      })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  function switchVersion(versionStr) {
    if (!manifest) return;
    const entry = manifest.versions.find(v => v.version === versionStr);
    if (!entry) return;
    setLoading(true);
    setCurrentVersion(versionStr);
    fetch(entry.artifacts.dashboard_data)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  return (
    <DataContext.Provider value={{ data, manifest, loading, error, currentVersion, switchVersion }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DataContext);
}
