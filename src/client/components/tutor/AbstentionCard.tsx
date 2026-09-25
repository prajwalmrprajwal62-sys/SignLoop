import { HelpCircle, MessageCircle } from 'lucide-react';

export function AbstentionCard({ status: _status = 'INSUFFICIENT_EVIDENCE', compact, answerText }: {
  status?: string;
  compact?: boolean;
  answerText?: string;
}) {
  // Better user-facing message — no "teacher will be notified" unless it's an actual teacher question
  const getMessage = () => {
    if (answerText && answerText.length > 0 && !answerText.includes('INSUFFICIENT') && !answerText.includes('approved evidence')) {
      return answerText;
    }
    return "I don't have specific notes on that yet. Try asking in your Review page → Ask Your Teacher section, or rephrase your question.";
  };

  if (compact) {
    return (
      <div className="px-3 py-2 rounded-xl rounded-bl-sm flex items-start gap-2" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
        <MessageCircle size={12} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">{getMessage()}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-600/30 bg-slate-800/40 p-4">
      <div className="flex items-start gap-3">
        <HelpCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-300 leading-relaxed">{getMessage()}</p>
      </div>
    </div>
  );
}
