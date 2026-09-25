import ReactMarkdown from 'react-markdown';
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

/** Shared markdown renderer — renders **bold**, numbered lists, emoji correctly */
function MarkdownAnswer({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`prose prose-invert prose-xs max-w-none ${className ?? ''}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="text-xs text-zinc-200 leading-relaxed mb-1.5 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-violet-300 font-semibold">{children}</strong>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-200">{children}</ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-200">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function TutorResponseView({ response, compact }: { response: TutorResponseData; compact?: boolean }) {
  const sourceIds: string[] = JSON.parse(response.source_ids_json || '[]') as string[];
  const isAbstained = response.retrieval_status === 'INSUFFICIENT_EVIDENCE' ||
    response.retrieval_status === 'ABSTAINED' ||
    response.retrieval_status === 'NEEDS_TEACHER' ||
    response.retrieval_status === 'SOURCES_CONFLICT';

  if (isAbstained) {
    return <AbstentionCard status={response.retrieval_status} compact={compact} answerText={response.answer_text} />;
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
        <MarkdownAnswer text={response.answer_text} />
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
      <MarkdownAnswer text={response.answer_text} />
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
