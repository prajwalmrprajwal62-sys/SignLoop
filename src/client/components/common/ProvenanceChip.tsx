
const PROVENANCE_COLORS: Record<string, string> = {
  TEACHER_KNOWLEDGE: 'bg-violet-600/20 text-violet-300 border-violet-600/30',
  STUDENT_EVIDENCE: 'bg-cyan-600/20 text-cyan-300 border-cyan-600/30',
  APPROVED_TRAINING: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
  LIVE: 'bg-red-600/20 text-red-300 border-red-600/30',
  REPLAY: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  SIMULATED: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  CACHED: 'bg-zinc-600/20 text-zinc-300 border-zinc-600/30',
};

interface ProvenanceChipProps {
  label: string;
  className?: string;
}

export function ProvenanceChip({ label, className = '' }: ProvenanceChipProps) {
  const colorClass = PROVENANCE_COLORS[label] ?? 'bg-zinc-800/40 text-zinc-400 border-zinc-700';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase tracking-wider ${colorClass} ${className}`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}
