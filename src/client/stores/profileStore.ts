import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileStore {
  activeProfileId: string | null;
  pseudonymousCode: string | null;
  role: string | null;
  contextType: string | null;
  consentGranted: boolean;
  setProfile: (profileId: string, code: string, role: string, contextType: string, consent: boolean) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      activeProfileId: null,
      pseudonymousCode: null,
      role: null,
      contextType: null,
      consentGranted: false,
      setProfile: (profileId, code, role, contextType, consent) =>
        set({ activeProfileId: profileId, pseudonymousCode: code, role, contextType, consentGranted: consent }),
      clearProfile: () =>
        set({ activeProfileId: null, pseudonymousCode: null, role: null, contextType: null, consentGranted: false }),
    }),
    {
      name: 'signloop-profile', // localStorage key
      // Only persist the identity fields — not the action functions
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
        pseudonymousCode: state.pseudonymousCode,
        role: state.role,
        contextType: state.contextType,
        consentGranted: state.consentGranted,
      }),
    }
  )
);
