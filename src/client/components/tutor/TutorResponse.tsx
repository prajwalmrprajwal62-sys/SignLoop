import { StatusBadge } from '../common/StatusBadge';
import { ProvenanceChip } from '../common/ProvenanceChip';
import { AbstentionCard } from './AbstentionCard';
import { GlassCard } from '../common/GlassCard';

interface TutorResponseData {
  response_id: string;
  answer_type: string;
  answer_text: string;
  source_ids_json: string;
  retrieval_status: string;
  abstention_reason: string | null;
}

export function TutorResponseView({ response, compact }: { response: TutorResponseData; compact?: boolean }) {
  const sourceIds: string[] = JSON.parse(response.source_ids_json || '[]') as string[];
  const isAbstained = response.retrieval_status === 'INSUFFICIENT_EVIDENCE' ||
    response.retrieval_status === 'ABSTAINED' ||
    response.retrieval_status === 'NEEDS_TEACHER' ||
    response.retrieval_status === 'SOURCES_CONFLICT';

  if (isAbstained) {
    return <AbstentionCard status={response.retrieval_status} compact={compact} />;
  }

  if (compact) {
    return (
      <div
        className="px-3 py-2.5 rounded-xl rounded-bl-sm space-y-1.5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-1.5">
          <StatusBadge status={response.retrieval_status} size="xs" />
          <span className="text-[10px] font-mono text-zinc-600">{response.answer_type}</span>
        </div>
        <p className="text-xs text-zinc-200 leading-relaxed">{response.answer_text}</p>
        {sourceIds.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="text-[9px] font-mono text-zinc-600 mr-1">Sources:</span>
            {sourceIds.map((id) => (
              <ProvenanceChip key={id} label={id} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={response.retrieval_status} size="xs" />
        <span className="text-[10px] font-mono text-zinc-500">RAG • {response.answer_type}</span>
      </div>
      <p className="text-sm text-zinc-200 leading-relaxed">{response.answer_text}</p>
      {sourceIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] font-mono text-zinc-500 mr-1">Sources:</span>
          {sourceIds.map((id) => (
            <ProvenanceChip key={id} label={id} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
