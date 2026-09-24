import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './layout/AppShell';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { LivePage } from './pages/LivePage';
import { PracticePage } from './pages/PracticePage';
import { TrainerPage } from './pages/TrainerPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#111116',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f4f4f5',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<RoleSelectPage />} />
        <Route element={<AppShell />}>
          <Route path="/live" element={<LivePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/trainer" element={<TrainerPage />} />
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
