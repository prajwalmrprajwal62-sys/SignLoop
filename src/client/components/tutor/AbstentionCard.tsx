import { HelpCircle } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function AbstentionCard({ status = 'INSUFFICIENT_EVIDENCE', compact }: { status?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-2" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <HelpCircle size={12} className="text-violet-400 shrink-0" />
        <div>
          <StatusBadge status={status} size="xs" />
          <p className="text-xs text-violet-300 mt-0.5">No teacher notes for this yet. Your teacher will be notified.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-violet-600/30 bg-violet-600/10 p-4">
      <div className="flex items-start gap-3">
        <HelpCircle size={18} className="text-violet-400 mt-0.5 shrink-0" />
        <div>
          <div className="mb-1"><StatusBadge status={status} size="xs" /></div>
          <p className="text-sm text-violet-200">
            No approved evidence found for this question. Ask your teacher.
          </p>
        </div>
      </div>
    </div>
  );
}
