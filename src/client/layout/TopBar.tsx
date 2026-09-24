import { useProfileStore } from '../stores/profileStore';
import { GradientText } from '../components/common/GradientText';
import { MonoLabel } from '../components/common/MonoLabel';

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  TEACHER: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
  STAFF: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
};

export function TopBar() {
  const { pseudonymousCode, role, contextType } = useProfileStore();
  const roleColor = role ? (ROLE_COLORS[role] ?? 'text-zinc-400 border-zinc-700 bg-zinc-800/40') : '';
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-white/5"
      style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientText className="text-xl font-extrabold tracking-tight">SignLoop</GradientText>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">workstation</span>
        </div>
        {role && (
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold uppercase tracking-wider ${roleColor}`}>
            {role}
          </div>
        )}
        <div className="flex items-center gap-3">
          {pseudonymousCode && <MonoLabel>{pseudonymousCode}</MonoLabel>}
          {contextType && (
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {contextType.replace(/_/g, ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-600/30 bg-emerald-600/10 text-emerald-400 text-[10px] font-mono font-semibold">
            ● SAVED LOCALLY
          </span>
        </div>
      </div>
    </header>
  );
}
