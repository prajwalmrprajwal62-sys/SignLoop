import { HelpCircle } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function AbstentionCard({ status = 'INSUFFICIENT_EVIDENCE' }: { status?: string }) {
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
