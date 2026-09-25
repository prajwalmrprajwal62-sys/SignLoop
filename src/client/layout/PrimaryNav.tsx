import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useEffect, useState } from 'react';
import {
  Radio, BookOpen, GraduationCap, MessageSquare, User,
  Users, Lightbulb, BarChart2,
} from 'lucide-react';

// ─── Role-specific navigation ────────────────────────────────────────────────
//
// STUDENT  → LIVE · PRACTICE · MY REVIEW · MY PROFILE
// TEACHER  → STUDENTS · REVIEW · ADD NOTE · COMMS · MY PROFILE
// STAFF    → COMMUNICATE · MY PROFILE
//
const ROLE_NAV: Record<string, Array<{ to: string; label: string; icon: React.ReactNode }>> = {
  STUDENT: [
    { to: '/live',      label: 'LIVE',       icon: <Radio size={14} /> },
    { to: '/practice',  label: 'PRACTICE',   icon: <BookOpen size={14} /> },
    { to: '/my-review', label: 'MY REVIEW',  icon: <BarChart2 size={14} /> },
    { to: '/profile',   label: 'MY PROFILE', icon: <User size={14} /> },
  ],
  TEACHER: [
    { to: '/trainer',       label: 'STUDENTS',  icon: <Users size={14} /> },
    { to: '/review',        label: 'REVIEW',    icon: <Radio size={14} /> },
    { to: '/knowledge',     label: 'ADD NOTE',  icon: <Lightbulb size={14} /> },
    { to: '/communication', label: 'COMMS',     icon: <MessageSquare size={14} /> },
    { to: '/profile',       label: 'MY PROFILE',icon: <User size={14} /> },
  ],
  STAFF: [
    { to: '/communication', label: 'COMMUNICATE', icon: <MessageSquare size={14} /> },
    { to: '/profile',       label: 'MY PROFILE',  icon: <User size={14} /> },
  ],
};

// Fallback if role is unknown
const DEFAULT_NAV = [
  { to: '/live',     label: 'LIVE',       icon: <Radio size={14} /> },
  { to: '/practice', label: 'PRACTICE',   icon: <BookOpen size={14} /> },
  { to: '/trainer',  label: 'TRAINER',    icon: <GraduationCap size={14} /> },
  { to: '/communication', label: 'COMMS', icon: <MessageSquare size={14} /> },
  { to: '/profile',  label: 'MY PROFILE', icon: <User size={14} /> },
];

const ROLE_ACCENT: Record<string, string> = {
  STUDENT: 'border-cyan-400 text-cyan-400',
  TEACHER: 'border-violet-500 text-violet-400',
  STAFF:   'border-purple-500 text-purple-400',
};

// First routes per role — used for auto-redirect on login
export const ROLE_HOME: Record<string, string> = {
  STUDENT: '/live',
  TEACHER: '/trainer',
  STAFF:   '/communication',
};

export function PrimaryNav() {
  const { role } = useProfileStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Unread question count (teachers only) — powers the notification badge on ADD NOTE
  const [unreadQuestions, setUnreadQuestions] = useState(0);

  const navItems = role ? (ROLE_NAV[role] ?? DEFAULT_NAV) : DEFAULT_NAV;
  const accentClass = role ? (ROLE_ACCENT[role] ?? 'border-slate-400 text-slate-400') : 'border-slate-600 text-slate-500';

  // Auto-redirect to role's home page if the user lands on a page not in their nav
  useEffect(() => {
    if (!role) return;
    const allowedPaths = navItems.map(i => i.to);
    const isAllowed = allowedPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (!isAllowed) {
      navigate(ROLE_HOME[role] ?? '/live', { replace: true });
    }
  }, [role, location.pathname, navItems, navigate]);

  // Poll unanswered question count for teachers
  useEffect(() => {
    if (role !== 'TEACHER') return;
    const fetchCount = () => {
      fetch('/api/questions/unread-count')
        .then(r => r.json() as Promise<{ count: number }>)
        .then(data => setUnreadQuestions(data.count ?? 0))
        .catch(() => null);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <nav
      className="fixed top-14 inset-x-0 z-40 h-10 border-b flex items-stretch"
      style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
      aria-label="Primary navigation"
    >
      <div className="max-w-7xl mx-auto w-full px-4 flex items-stretch">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to + label}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-1.5 px-4 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                isActive
                  ? `${accentClass} bg-white/5`
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`
            }
          >
            {icon}
            {label}
            {/* Notification badge — ADD NOTE tab for teachers with pending student questions */}
            {role === 'TEACHER' && to === '/knowledge' && unreadQuestions > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[15px] h-[15px] text-[9px] font-bold bg-amber-500 text-zinc-950 rounded-full flex items-center justify-center px-0.5 leading-none"
                title={`${unreadQuestions} unanswered student question${unreadQuestions !== 1 ? 's' : ''}`}
              >
                {unreadQuestions > 9 ? '9+' : unreadQuestions}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
