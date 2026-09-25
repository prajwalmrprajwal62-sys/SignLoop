import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from './layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { LivePage } from './pages/LivePage';
import { PracticePage } from './pages/PracticePage';
import { TrainerPage } from './pages/TrainerPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { CommunicationPage } from './pages/CommunicationPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/select" element={<RoleSelectPage />} />
        <Route element={<AppShell />}>
          <Route path="/live" element={<LivePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/trainer" element={<TrainerPage />} />
          <Route path="/review" element={<ReviewQueuePage />} />
          {/* /knowledge is the teacher ADD NOTE shortcut — handled by TrainerPage */}
          <Route path="/knowledge" element={<TrainerPage />} />
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
