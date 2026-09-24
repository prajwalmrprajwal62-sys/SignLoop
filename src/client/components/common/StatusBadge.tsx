import { Check, X, AlertTriangle, Info, Clock, Eye, RefreshCw, Ban, BookOpen, AlertCircle, HelpCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  PASS: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'PASS' },
  FAIL: { icon: <X size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'FAIL' },
  NOT_EVALUATED: { icon: <Clock size={12} />, color: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/30', label: 'NOT EVALUATED' },
  CANDIDATE_READY: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'CANDIDATE READY' },
  REVIEW_REQUIRED: { icon: <AlertTriangle size={12} />, color: 'text-amber-400', bg: 'bg-amber-600/15', border: 'border-amber-600/30', label: 'REVIEW REQUIRED' },
  SIGNAL_INVALID: { icon: <X size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'SIGNAL INVALID' },
  INPUT_LOST: { icon: <AlertCircle size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'INPUT LOST' },
  NO_SIGN: { icon: <Eye size={12} />, color: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/30', label: 'NO SIGN' },
  CONFIRMED: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'CONFIRMED' },
  CORRECTED: { icon: <RefreshCw size={12} />, color: 'text-blue-400', bg: 'bg-blue-600/15', border: 'border-blue-600/30', label: 'CORRECTED' },
  REJECTED: { icon: <X size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'REJECTED' },
  NEEDS_REPEAT: { icon: <RefreshCw size={12} />, color: 'text-amber-400', bg: 'bg-amber-600/15', border: 'border-amber-600/30', label: 'NEEDS REPEAT' },
  ABSTAINED: { icon: <Ban size={12} />, color: 'text-violet-400', bg: 'bg-violet-600/15', border: 'border-violet-600/30', label: 'ABSTAINED' },
  GROUNDED: { icon: <BookOpen size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'GROUNDED' },
  INSUFFICIENT_EVIDENCE: { icon: <HelpCircle size={12} />, color: 'text-violet-400', bg: 'bg-violet-600/15', border: 'border-violet-600/30', label: 'INSUFFICIENT EVIDENCE' },
  NEEDS_TEACHER: { icon: <HelpCircle size={12} />, color: 'text-amber-400', bg: 'bg-amber-600/15', border: 'border-amber-600/30', label: 'NEEDS TEACHER' },
  SOURCES_CONFLICT: { icon: <AlertTriangle size={12} />, color: 'text-orange-400', bg: 'bg-orange-600/15', border: 'border-orange-600/30', label: 'SOURCES CONFLICT' },
  DRAFT: { icon: <Clock size={12} />, color: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/30', label: 'DRAFT' },
  APPROVED: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'APPROVED' },
  ACTIVE: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'ACTIVE' },
  SUPERSEDED: { icon: <RefreshCw size={12} />, color: 'text-blue-400', bg: 'bg-blue-600/15', border: 'border-blue-600/30', label: 'SUPERSEDED' },
  REVOKED: { icon: <X size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'REVOKED' },
  IMPROVED: { icon: <Check size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-600/15', border: 'border-emerald-600/30', label: 'IMPROVED' },
  STABLE: { icon: <Info size={12} />, color: 'text-blue-400', bg: 'bg-blue-600/15', border: 'border-blue-600/30', label: 'STABLE' },
  WORSE: { icon: <X size={12} />, color: 'text-red-400', bg: 'bg-red-600/15', border: 'border-red-600/30', label: 'WORSE' },
  UNCLEAR: { icon: <HelpCircle size={12} />, color: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/30', label: 'UNCLEAR' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    icon: <Info size={12} />,
    color: 'text-zinc-400',
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-700/30',
    label: status,
  };
  const textSize = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono font-medium ${config.bg} ${config.border} ${config.color} ${textSize} ${className}`}
      role="status"
      aria-label={config.label}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
