import { create } from 'zustand';

type SourceType = 'GLOVE' | 'CAMERA' | 'SIMULATED' | 'REPLAY';

interface SessionStore {
  sessionId: string | null;
  sourceType: SourceType;
  selectedFixtureId: string | null;
  setSession: (sessionId: string) => void;
  setSourceType: (sourceType: SourceType) => void;
  setFixture: (fixtureId: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  sourceType: 'SIMULATED',
  selectedFixtureId: null,
  setSession: (sessionId) => set({ sessionId }),
  setSourceType: (sourceType) => set({ sourceType }),
  setFixture: (fixtureId) => set({ selectedFixtureId: fixtureId }),
  clearSession: () => set({ sessionId: null, selectedFixtureId: null }),
}));
