import ReactMarkdown from 'react-markdown';
import { MessageCircle } from 'lucide-react';

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="text-xs text-slate-400 leading-relaxed mb-1 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="text-violet-300 font-semibold">{children}</strong>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-400">{children}</ol>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-400">{children}</ul>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function AbstentionCard({ status: _status = 'INSUFFICIENT_EVIDENCE', compact, answerText }: {
  status?: string;
  compact?: boolean;
  answerText?: string;
}) {
  const getMessage = () => {
    if (answerText && answerText.length > 0 && !answerText.includes('INSUFFICIENT') && !answerText.includes('approved evidence')) {
      return answerText;
    }
    return `💡 **No specific notes found yet.**\n\n🎯 Head to **My Review → Ask Your Teacher** to send a question — your teacher's answer will train the tutor for next time!`;
  };

  if (compact) {
    return (
      <div className="px-3 py-2 rounded-xl rounded-bl-sm flex items-start gap-2" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
        <MessageCircle size={12} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <MarkdownText text={getMessage()} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-600/30 bg-slate-800/40 p-4">
      <div className="flex items-start gap-3">
        <MessageCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <MarkdownText text={getMessage()} />
        </div>
      </div>
    </div>
  );
}
