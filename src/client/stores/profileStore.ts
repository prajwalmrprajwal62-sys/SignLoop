import { create } from 'zustand';

interface ProfileStore {
  activeProfileId: string | null;
  pseudonymousCode: string | null;
  role: string | null;
  contextType: string | null;
  consentGranted: boolean;
  setProfile: (profileId: string, code: string, role: string, contextType: string, consent: boolean) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  activeProfileId: null,
  pseudonymousCode: null,
  role: null,
  contextType: null,
  consentGranted: false,
  setProfile: (profileId, code, role, contextType, consent) =>
    set({ activeProfileId: profileId, pseudonymousCode: code, role, contextType, consentGranted: consent }),
  clearProfile: () =>
    set({ activeProfileId: null, pseudonymousCode: null, role: null, contextType: null, consentGranted: false }),
}));
