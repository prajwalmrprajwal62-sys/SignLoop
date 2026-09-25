import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '../../stores/profileStore';
import { GradientText } from '../../components/common/GradientText';
import { apiPost } from '../../api/client';

interface Profile {
  id: string;
  pseudonymous_code: string;
  role: string;
  preferred_locale: string;
  visibility_status: string;
}

type AuthMode = 'LOGIN' | 'REGISTER';

// Context is auto-assigned by role — no user selection needed
// STUDENT  → LEARNING_PRACTICE  (they're practicing gestures with teacher)
// TEACHER  → LEARNING_PRACTICE  (they supervise student practice)
// STAFF    → REAL_WORLD_INTERACTION (they facilitate live communication)
const ROLE_CONTEXT: Record<string, 'LEARNING_PRACTICE' | 'REAL_WORLD_INTERACTION'> = {
  STUDENT: 'LEARNING_PRACTICE',
  TEACHER: 'LEARNING_PRACTICE',
  STAFF:   'REAL_WORLD_INTERACTION',
};

const ROLE_HOME: Record<string, string> = {
  STUDENT: '/live',
  TEACHER: '/trainer',
  STAFF:   '/communication',
};

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    // Mode that gets auto-applied
    mode: 'Learning Practice',
    modeDesc: 'Practice gestures assigned by your teacher. Build your sign vocabulary step by step. Your teacher reviews your progress.',
    // What they'll see after login
    features: ['Gesture practice sessions', 'RAG-powered tutor', 'Progress review', 'Teacher feedback'],
    bg: 'linear-gradient(135deg, #1E1060 0%, #0D2060 40%, #0A1A40 100%)',
    accent: '#2DE2E6',
    glow: 'rgba(45,226,230,0.25)',
    emoji: '🤲',
  },
  {
    id: 'TEACHER',
    label: 'Teacher',
    mode: 'Learning Supervision',
    modeDesc: 'Monitor student sessions, review flagged gestures, and add knowledge notes that directly power the student tutor.',
    features: ['Student overview', 'Review queue', 'Add tutor notes', 'Follow-up tracking'],
    bg: 'linear-gradient(135deg, #2D1060 0%, #1A0A50 40%, #0A1040 100%)',
    accent: '#6E56CF',
    glow: 'rgba(110,86,207,0.25)',
    emoji: '👩‍🏫',
  },
  {
    id: 'STAFF',
    label: 'Communicator',
    mode: 'Real-World Communication',
    modeDesc: 'Receive live gesture captions from a deaf person\'s glove. Understand what they are expressing in real time.',
    features: ['Live gesture captions', 'Real-time display', 'Session history'],
    bg: 'linear-gradient(135deg, #0A2040 0%, #0A1860 40%, #001230 100%)',
    accent: '#A855F7',
    glow: 'rgba(168,85,247,0.25)',
    emoji: '💬',
  },
];

export function RoleSelectPage() {
  const navigate = useNavigate();
  const { setProfile } = useProfileStore();
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pseudonymousCode, setPseudonymousCode] = useState('');
  const [pin, setPin] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogin = pseudonymousCode.trim() !== '' && consent;
  const canRegister = pseudonymousCode.trim() !== '' && selectedRole !== null && consent;

  // Context is determined by role — never by user input
  const getContext = (role: string): 'LEARNING_PRACTICE' | 'REAL_WORLD_INTERACTION' =>
    ROLE_CONTEXT[role] ?? 'LEARNING_PRACTICE';

  const handleLogin = async () => {
    if (!canLogin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ ok: boolean; profile: Profile }>('/api/profiles/login', {
        pseudonymous_code: pseudonymousCode.trim(),
        pin: pin || undefined,
      });
      const profile = res.profile;
      setProfile(profile.id, profile.pseudonymous_code, profile.role, getContext(profile.role), true);
      navigate(ROLE_HOME[profile.role] ?? '/live');
    } catch (err) {
      const msg = String(err);
      if (msg.includes('404')) setError('Profile not found. Check your code or register a new account.');
      else if (msg.includes('401')) setError('Incorrect PIN. Try again.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!canRegister) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{ ok: boolean; profile: Profile }>('/api/profiles/register', {
        pseudonymous_code: pseudonymousCode.trim(),
        role: selectedRole,
        pin: pin || undefined,
      });
      const profile = res.profile;
      setProfile(profile.id, profile.pseudonymous_code, profile.role, getContext(profile.role), true);
      navigate(ROLE_HOME[profile.role] ?? '/live');
    } catch (err) {
      const msg = String(err);
      if (msg.includes('409')) setError('Code already in use. Try logging in instead.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (authMode === 'LOGIN') void handleLogin();
    else void handleRegister();
  };

  const activeRole = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden relative flex flex-col items-center justify-center p-8">
      {/* Background orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(45,226,230,0.07) 0%, transparent 70%)', top: '10%', left: '15%' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', bottom: '15%', right: '10%' }}
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.9, 0.4, 0.9] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Logo */}
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GradientText className="text-6xl font-extrabold tracking-tight">SignLoop</GradientText>
        <p className="text-zinc-500 font-mono text-sm mt-2 uppercase tracking-widest">Local gesture workstation</p>
      </motion.div>

      <div className="w-full max-w-3xl flex gap-6">
        {/* LEFT — Role cards */}
        <motion.div
          className="flex flex-col gap-3 w-56 shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
            {authMode === 'REGISTER' ? 'Choose your role' : 'Who are you?'}
          </p>
          {ROLES.map(role => {
            const isSelected = selectedRole === role.id;
            return (
              <motion.button
                key={role.id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole(role.id)}
                className="w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer"
                style={{
                  background: isSelected ? role.bg : 'rgba(255,255,255,0.03)',
                  borderColor: isSelected ? role.accent : 'rgba(255,255,255,0.08)',
                  boxShadow: isSelected ? `0 0 24px ${role.glow}` : 'none',
                }}
              >
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xl">{role.emoji}</span>
                  <span className="font-extrabold uppercase tracking-wider text-sm" style={{ color: isSelected ? role.accent : '#e2e8f0' }}>
                    {role.label}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0"
                      style={{ background: role.accent, color: '#09090B' }}>✓</span>
                  )}
                </div>
                {/* Mode badge */}
                <div
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md inline-block"
                  style={{
                    color: role.accent,
                    background: `${role.accent}15`,
                    border: `1px solid ${role.accent}30`,
                  }}
                >
                  {role.mode}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* RIGHT — Form + role detail */}
        <motion.div
          className="flex-1 space-y-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Role detail card */}
          {activeRole ? (
            <motion.div
              key={activeRole.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border p-4 space-y-3"
              style={{
                background: `${activeRole.accent}08`,
                borderColor: `${activeRole.accent}25`,
              }}
            >
              <p className="text-xs text-zinc-300 leading-relaxed">{activeRole.modeDesc}</p>
              <div className="flex flex-wrap gap-1.5">
                {activeRole.features.map(f => (
                  <span
                    key={f}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                    style={{ color: activeRole.accent, borderColor: `${activeRole.accent}30`, background: `${activeRole.accent}10` }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-white/6 p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-zinc-600 text-xs font-mono">← Select a role to see what you'll have access to</p>
            </div>
          )}

          {/* Auth form */}
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 space-y-4">
            {/* LOGIN / REGISTER toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(['LOGIN', 'REGISTER'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setAuthMode(mode); setError(null); }}
                  className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                    authMode === mode
                      ? 'bg-white/15 text-white'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {mode === 'LOGIN' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {/* Code field */}
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                Your Code {authMode === 'LOGIN' ? '(e.g. STU-01)' : '(choose a unique name)'}
              </label>
              <input
                type="text"
                placeholder={authMode === 'LOGIN' ? 'Enter your code' : 'e.g. STU-03 or Priya'}
                className="w-full bg-zinc-900 border border-white/15 rounded-lg p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                value={pseudonymousCode}
                onChange={e => setPseudonymousCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                PIN <span className="text-zinc-700">(optional — leave blank for no PIN)</span>
              </label>
              <input
                type="password"
                placeholder="••••"
                maxLength={8}
                className="w-full bg-zinc-900 border border-white/15 rounded-lg p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>

            {/* Register hint */}
            {authMode === 'REGISTER' && !selectedRole && (
              <p className="text-amber-400 text-xs font-mono">← Select a role on the left before registering</p>
            )}

            {/* Consent */}
            <label className="flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 accent-cyan-400 shrink-0"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
              <span>Local-only tool. No data leaves this device.</span>
            </label>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg border border-red-600/30 p-3 text-red-400 text-xs font-mono"
                style={{ background: 'rgba(220,38,38,0.1)' }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={(authMode === 'LOGIN' ? !canLogin : !canRegister) || loading}
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-teal-500 text-zinc-950 font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-teal-400 transition-all text-sm"
            >
              {loading ? 'Working…' : authMode === 'LOGIN' ? 'Sign In →' : 'Create Profile →'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
