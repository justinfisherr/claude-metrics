import { Routes, Route } from 'react-router-dom';
import { DataProvider } from './hooks/useDashboardData';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Review from './pages/Review';
import Dictionary from './pages/Dictionary';
import Playlists from './pages/Playlists';
import Wrapped from './pages/Wrapped';
import Memories from './pages/Memories';

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/review" element={<Review />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/wrapped" element={<Wrapped />} />
        <Route path="/memories" element={<Memories />} />
      </Routes>
    </DataProvider>
  );
}
