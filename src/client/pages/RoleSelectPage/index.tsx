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

const ROLES = [
  {
    id: 'STUDENT',
    label: 'Student',
    subtitle: 'Practice and communicate',
    bg: 'linear-gradient(135deg, #1E1060 0%, #0D2060 40%, #0A1A40 100%)',
    accent: '#2DE2E6',
    glow: 'rgba(45,226,230,0.25)',
  },
  {
    id: 'TEACHER',
    label: 'Teacher',
    subtitle: 'Review evidence and guide students',
    bg: 'linear-gradient(135deg, #2D1060 0%, #1A0A50 40%, #0A1040 100%)',
    accent: '#6E56CF',
    glow: 'rgba(110,86,207,0.25)',
  },
  {
    id: 'STAFF',
    label: 'Communication',
    subtitle: 'Real-world communication support',
    bg: 'linear-gradient(135deg, #0A2040 0%, #0A1860 40%, #001230 100%)',
    accent: '#A855F7',
    glow: 'rgba(168,85,247,0.25)',
  },
];

const ROLE_HOME: Record<string, string> = {
  STUDENT: '/live',
  TEACHER: '/trainer',
  STAFF: '/communication',
};

export function RoleSelectPage() {
  const navigate = useNavigate();
  const { setProfile } = useProfileStore();
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pseudonymousCode, setPseudonymousCode] = useState('');
  const [pin, setPin] = useState('');
  const [contextType, setContextType] = useState<'LEARNING_PRACTICE' | 'REAL_WORLD_INTERACTION'>('LEARNING_PRACTICE');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogin = pseudonymousCode.trim() !== '' && consent;
  const canRegister = pseudonymousCode.trim() !== '' && selectedRole !== null && consent;

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
      setProfile(profile.id, profile.pseudonymous_code, profile.role, contextType, true);
      navigate(ROLE_HOME[profile.role] ?? '/live');
    } catch (err) {
      const msg = String(err);
      if (msg.includes('404')) {
        setError('Profile not found. Check your code or register a new account.');
      } else if (msg.includes('401')) {
        setError('Incorrect PIN. Please try again.');
      } else {
        setError(msg);
      }
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
      setProfile(profile.id, profile.pseudonymous_code, profile.role, contextType, true);
      navigate(ROLE_HOME[profile.role] ?? '/live');
    } catch (err) {
      const msg = String(err);
      if (msg.includes('409')) {
        setError('A profile with that code already exists. Try logging in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (authMode === 'LOGIN') {
      void handleLogin();
    } else {
      void handleRegister();
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden relative flex flex-col items-center justify-center p-8">
      {/* Animated background orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(45,226,230,0.08) 0%, transparent 70%)', top: '10%', left: '15%' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', bottom: '15%', right: '10%' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [1, 0.5, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Logo */}
      <motion.div
        className="mb-12 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GradientText className="text-6xl font-extrabold tracking-tight">SignLoop</GradientText>
        <p className="text-zinc-500 font-mono text-sm mt-2 uppercase tracking-widest">Local gesture workstation</p>
      </motion.div>

      {/* Role cards */}
      <motion.div
        className="flex gap-6 mb-12"
        style={{ perspective: '1200px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id;
          return (
            <motion.div
              key={role.id}
              whileHover={{ rotateX: 4, rotateY: -4, scale: 1.03, y: -4 }}
              onClick={() => setSelectedRole(role.id)}
              className="w-60 h-76 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 border-2 transition-all duration-300 p-6 select-none relative"
              style={{
                background: role.bg,
                borderColor: isSelected ? role.accent : 'rgba(255,255,255,0.1)',
                boxShadow: isSelected ? `0 0 32px ${role.glow}, 0 0 0 1px ${role.accent}40` : 'none',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2"
                style={{ borderColor: role.accent, boxShadow: `0 0 16px ${role.glow}` }}
              >
                <div className="w-6 h-6 rounded-full" style={{ background: role.accent, opacity: 0.7 }} />
              </div>
              <span className="text-xl font-extrabold tracking-widest uppercase" style={{ color: role.accent }}>
                {role.label}
              </span>
              <span className="text-xs text-center font-mono" style={{ color: `${role.accent}99` }}>
                {role.subtitle}
              </span>
              {isSelected && (
                <div
                  className="absolute bottom-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{ background: role.accent, color: '#09090B', fontWeight: 900 }}
                >
                  ✓
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Config panel */}
      <motion.div
        className="w-full max-w-md space-y-5 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Auth mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {(['LOGIN', 'REGISTER'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => { setAuthMode(mode); setError(null); }}
              className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                authMode === mode
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Pseudonymous code input */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
            Pseudonymous Code
          </label>
          <input
            type="text"
            placeholder="Enter your code / username"
            className="w-full bg-zinc-900 border border-white/15 rounded-lg p-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
            value={pseudonymousCode}
            onChange={e => setPseudonymousCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>

        {/* Optional PIN */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
            PIN <span className="text-zinc-600">(optional)</span>
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

        {/* Role hint for register mode */}
        {authMode === 'REGISTER' && !selectedRole && (
          <p className="text-amber-400 text-xs font-mono">↑ Select a role above to register</p>
        )}

        {/* Context toggle */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase tracking-wider">
            Context
          </label>
          <div className="flex gap-2">
            {(['LEARNING_PRACTICE', 'REAL_WORLD_INTERACTION'] as const).map(ctx => (
              <button
                key={ctx}
                onClick={() => setContextType(ctx)}
                className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider border transition-all ${
                  contextType === ctx
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-transparent border-white/10 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {ctx.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Consent */}
        <label className="flex items-start gap-3 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-cyan-400"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
          />
          <span>I understand this is a local-only training tool. No data leaves this device.</span>
        </label>

        {/* Error message */}
        {error && (
          <div
            className="rounded-lg border border-red-600/30 p-3 text-red-400 text-sm font-mono"
            style={{ background: 'rgba(220,38,38,0.1)' }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={(authMode === 'LOGIN' ? !canLogin : !canRegister) || loading}
          className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-500 text-zinc-950 font-extrabold uppercase tracking-wider rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-teal-400 transition-all"
        >
          {loading
            ? 'Working…'
            : authMode === 'LOGIN'
              ? 'Login →'
              : 'Register →'}
        </button>
      </motion.div>
    </div>
  );
}
