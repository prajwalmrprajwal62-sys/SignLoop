import { useState } from 'react';
import { HelpCircle, Eye, ChevronRight, MessageCircle, Loader2 } from 'lucide-react';
import { apiPost } from '../../api/client';
import { TutorResponseView } from './TutorResponse';

const TUTOR_BUTTONS = [
  { label: 'Why this task?', queryType: 'WHY_TASK', icon: <HelpCircle size={14} /> },
  { label: 'Show gesture', queryType: 'SHOW_REFERENCE', icon: <Eye size={14} /> },
  { label: "What's next?", queryType: 'WHAT_NEXT', icon: <ChevronRight size={14} /> },
  { label: 'Ask teacher', queryType: 'ASK_TEACHER', icon: <MessageCircle size={14} /> },
];

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

export function TutorPanel({ profileId, contextType, role, consentGranted, intentId, sessionId }: TutorPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [response, setResponse] = useState<TutorResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (queryType: string) => {
    if (!consentGranted) { setError('Consent required for RAG retrieval.'); return; }
    setLoading(queryType);
    setError(null);
    try {
      const result = await apiPost<{ ok: boolean; response: TutorResponseData }>('/api/tutor/respond', {
        profile_id: profileId,
        context: contextType,
        role,
        consent_granted: consentGranted,
        query_text: intentId ?? '',
        intent_id: intentId,
        query_type: queryType,
        session_id: sessionId,
      });
      setResponse(result.response);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* 4 fixed action buttons — NO free-form text input */}
      <div className="grid grid-cols-2 gap-2">
        {TUTOR_BUTTONS.map(({ label, queryType, icon }) => (
          <button
            key={queryType}
            onClick={() => void handleQuery(queryType)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-xs font-mono font-medium hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === queryType ? <Loader2 size={14} className="animate-spin" /> : icon}
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono px-1">{error}</p>
      )}

      {response && <TutorResponseView response={response} />}
    </div>
  );
}
