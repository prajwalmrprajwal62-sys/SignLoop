import { NavLink } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { Radio, BookOpen, GraduationCap, MessageSquare, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/live', label: 'LIVE', icon: <Radio size={14} /> },
  { to: '/practice', label: 'PRACTICE', icon: <BookOpen size={14} /> },
  { to: '/trainer', label: 'TRAINER', icon: <GraduationCap size={14} /> },
  { to: '/communication', label: 'COMMS', icon: <MessageSquare size={14} /> },
  { to: '/profile', label: 'MY PROFILE', icon: <User size={14} /> },
];

const ROLE_ACCENT: Record<string, string> = {
  STUDENT: 'border-cyan-400 text-cyan-400',
  TEACHER: 'border-violet-500 text-violet-400',
  STAFF: 'border-purple-500 text-purple-400',
};

export function PrimaryNav() {
  const { role } = useProfileStore();
  const accentClass = role ? (ROLE_ACCENT[role] ?? 'border-zinc-400 text-zinc-400') : 'border-zinc-600 text-zinc-500';
  return (
    <nav
      className="fixed top-14 inset-x-0 z-40 h-10 border-b border-white/5 flex items-stretch"
      style={{ background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(12px)' }}
      aria-label="Primary navigation"
    >
      <div className="max-w-7xl mx-auto w-full px-4 flex items-stretch">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                isActive
                  ? `${accentClass} bg-white/5`
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
