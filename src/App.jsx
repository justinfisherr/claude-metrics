import { Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './hooks/useDashboardData';
import { AuthProvider } from './lib/authContext';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Review from './pages/Review';
import Dictionary from './pages/Dictionary';
import Playlists from './pages/Playlists';
import Wrapped from './pages/Wrapped';
import Memories from './pages/Memories';
import Facts from './pages/Facts';
import Listen from './pages/Listen';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/review" element={<Review />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/wrapped" element={<Wrapped />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/facts" element={<Facts />} />
          <Route path="/listen" element={<Listen />} />
          <Route path="/search" element={<Navigate to="/listen" replace />} />
          <Route path="/score-playlist" element={<Navigate to="/listen" replace />} />
        </Routes>
      </DataProvider>
    </AuthProvider>
  );
}
