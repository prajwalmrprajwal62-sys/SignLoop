import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Eye, ChevronRight, BookOpen, Loader2, Send, Sparkles } from 'lucide-react';
import { apiPost } from '../../api/client';
import { TutorResponseView } from './TutorResponse';

interface TutorPanelProps {
  profileId: string;
  contextType: string;
  role: string;
  consentGranted: boolean;
  intentId?: string;
  sessionId?: string;
}

interface TutorResponseData {
  response_id: string;
  answer_type: string;
  answer_text: string;
  source_ids_json: string;
  retrieval_status: string;
  abstention_reason: string | null;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'tutor';
  text: string;
  queryType?: string;
  response?: TutorResponseData;
  loading?: boolean;
}

// Quick buttons — all go through general RAG retrieval now
const QUICK_BUTTONS = [
  { label: 'Why this task?',  queryType: 'WHY_TASK',       icon: <HelpCircle size={12} /> },
  { label: 'Show gesture',    queryType: 'SHOW_REFERENCE', icon: <Eye size={12} /> },
  { label: "What's next?",    queryType: 'WHAT_NEXT',      icon: <ChevronRight size={12} /> },
  { label: 'How to improve?', queryType: 'WHY_TASK',       icon: <Sparkles size={12} /> },
];

export function TutorPanel({ profileId, contextType, role, consentGranted, intentId, sessionId }: TutorPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeQueryType, setActiveQueryType] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-run SHOW_REFERENCE on mount to show gesture info immediately
  useEffect(() => {
    void handleQuery('SHOW_REFERENCE', 'How to sign this gesture');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuery = async (queryType: string, label: string, customText?: string) => {
    if (!consentGranted) return;
    const userMsgId = crypto.randomUUID();
    const tutorMsgId = crypto.randomUUID();
    // For free text: use the typed question as query text so FTS5 can search it
    const queryText = customText ?? intentId ?? '';

    setMessages(prev => [
      ...prev,
      { id: userMsgId, type: 'user', text: customText ?? label, queryType },
      { id: tutorMsgId, type: 'tutor', text: '', loading: true },
    ]);
    setSubmitting(true);
    setActiveQueryType(queryType);

    try {
      const result = await apiPost<{ ok: boolean; response: TutorResponseData }>('/api/tutor/respond', {
        profile_id: profileId,
        context: contextType,
        role,
        consent_granted: consentGranted,
        query_text: queryText,
        intent_id: intentId,
        query_type: queryType,
        session_id: sessionId,
      });

      setMessages(prev => prev.map(m =>
        m.id === tutorMsgId
          ? { ...m, loading: false, response: result.response, text: result.response.answer_text }
          : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === tutorMsgId
          ? { ...m, loading: false, text: `Error: ${String(err)}` }
          : m
      ));
    } finally {
      setSubmitting(false);
      setActiveQueryType(null);
    }
  };

  const handleSend = () => {
    const text = freeText.trim();
    if (!text || submitting) return;
    setFreeText('');
    // Free text → use WHY_TASK so it goes through full RAG retrieval
    void handleQuery('WHY_TASK', text, text);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-violet-500/25 overflow-hidden" style={{ background: 'rgba(20,14,40,0.85)', minHeight: 340 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-500/15" style={{ background: 'rgba(139,92,246,0.08)' }}>
        <BookOpen size={13} className="text-violet-400" />
        <span className="text-violet-300 text-xs font-semibold uppercase tracking-wider">AI Sign Tutor</span>
        <span className="ml-auto text-[10px] font-mono text-slate-600">RAG · grounded</span>
      </div>

      {/* Quick-action buttons */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {QUICK_BUTTONS.map(({ label, queryType, icon }) => (
          <button
            key={label}
            onClick={() => void handleQuery(queryType, label)}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            {activeQueryType === queryType ? <Loader2 size={11} className="animate-spin" /> : icon}
            {label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 340 }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-xs font-mono">Loading sign language knowledge…</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'user' ? (
              <div
                className="max-w-[80%] px-3 py-2 rounded-xl rounded-br-sm text-xs text-white"
                style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] space-y-1">
                {msg.loading ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Loader2 size={12} className="animate-spin text-violet-400" />
                    <span className="text-slate-500 text-xs font-mono">Searching knowledge base…</span>
                  </div>
                ) : msg.response ? (
                  <TutorResponseView response={msg.response} compact />
                ) : (
                  <div className="px-3 py-2 rounded-xl text-xs text-red-400 font-mono" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {msg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Free-text input */}
      <div className="px-4 py-3 border-t border-white/6" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <input
            type="text"
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about any gesture, technique, or tip…"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-600 outline-none font-mono"
          />
          <button
            onClick={handleSend}
            disabled={!freeText.trim() || submitting}
            className="text-violet-400 hover:text-violet-300 disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 font-mono mt-1.5 text-center">
          Answers from sign language knowledge base · personalized to your practice
        </p>
      </div>
    </div>
  );
}
