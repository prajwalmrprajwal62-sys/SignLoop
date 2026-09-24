import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { GradientText } from '../components/common/GradientText';
import { MonoLabel } from '../components/common/MonoLabel';
import { LogOut } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  TEACHER: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
  STAFF: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
};

export function TopBar() {
  const navigate = useNavigate();
  const { pseudonymousCode, role, contextType, clearProfile } = useProfileStore();
  const roleColor = role ? (ROLE_COLORS[role] ?? 'text-slate-400 border-slate-700 bg-slate-800/40') : '';

  const handleLogout = () => {
    clearProfile();
    navigate('/');
  };

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 h-14 border-b"
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientText className="text-xl font-extrabold tracking-tight">SignLoop</GradientText>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">workstation</span>
        </div>
        {role && (
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold uppercase tracking-wider ${roleColor}`}>
            {role}
          </div>
        )}
        <div className="flex items-center gap-3">
          {pseudonymousCode && <MonoLabel>{pseudonymousCode}</MonoLabel>}
          {contextType && (
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider hidden sm:block">
              {contextType.replace(/_/g, ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-600/30 bg-emerald-600/10 text-emerald-400 text-[10px] font-mono font-semibold">
            ● SAVED LOCALLY
          </span>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Sign out — return to home"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600/40 bg-slate-800/40 text-slate-400 hover:text-white hover:border-slate-500/60 hover:bg-slate-700/60 text-xs font-mono transition-all"
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
