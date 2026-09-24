import { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MonoLabel } from '../../components/common/MonoLabel';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { Users, FileText, Save } from 'lucide-react';

interface Candidate {
  candidate_id: string;
  intent_label: string;
  score: number | null;
  policy_route: string;
  why_reason_code: string | null;
  session_id: string;
  provenance: string;
}

interface Decision {
  decision_id: string;
  action: string;
  final_intent: string | null;
  created_at: string;
}

export function TrainerPage() {
  const { activeProfileId, role, contextType } = useProfileStore();
  const [allCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteStatus, setNoteStatus] = useState<'DRAFT' | 'APPROVED'>('DRAFT');
  const [loading, setLoading] = useState(false);

  // Fetch all sessions for this profile, then all their candidates
  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    // There's no GET /api/candidates endpoint — candidates are per-session.
    // We fetch profile's sessions from the session timeline approach.
    // For the trainer page we surface a queue of REVIEW_REQUIRED candidates.
    // Since we cannot list all sessions easily, we surface placeholder state.
    setLoading(false);
  }, [activeProfileId]);

  // When a candidate is selected, load its decisions
  useEffect(() => {
    if (!selectedCandidate) { setDecisions([]); return; }
    apiGet<{ ok: boolean; decisions: Decision[] }>(
      `/api/candidates/${selectedCandidate.candidate_id}/decisions`
    )
      .then(res => setDecisions(res.decisions ?? []))
      .catch(console.error);
  }, [selectedCandidate]);

  const handleDecision = async (action: 'CONFIRM' | 'CORRECT' | 'REJECT') => {
    if (!selectedCandidate || !activeProfileId) return;
    const endpointMap = { CONFIRM: 'confirm', CORRECT: 'correct', REJECT: 'reject' };
    try {
      await apiPost(`/api/candidates/${selectedCandidate.candidate_id}/${endpointMap[action]}`, {
        actor_role: 'TEACHER',
        actor_profile_id: activeProfileId,
        session_id: selectedCandidate.session_id,
        profile_id: activeProfileId,
        context: contextType ?? 'LEARNING_PRACTICE',
        role: role ?? 'TEACHER',
        provenance: 'LIVE',
        final_intent: selectedCandidate.intent_label,
      });
      // Reload decisions
      const res = await apiGet<{ ok: boolean; decisions: Decision[] }>(
        `/api/candidates/${selectedCandidate.candidate_id}/decisions`
      );
      setDecisions(res.decisions ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedCandidate || !activeProfileId) return;
    try {
      await apiPost('/api/knowledge/sources', {
        source_class: 'TEACHER_KNOWLEDGE',
        profile_id: activeProfileId,
        intent_id: selectedCandidate.intent_label,
        author_id: activeProfileId,
        author_role: 'TEACHER',
        content: noteText,
        content_type: 'text/plain',
        locale: 'en-IN',
        consent_scope: contextType ?? 'LEARNING_PRACTICE',
        retention_class: 'PERMANENT_AUDIT',
        supersedes_id: null,
        session_id: selectedCandidate.session_id,
        event_id: null,
        task_id: null,
        context: contextType ?? 'LEARNING_PRACTICE',
        source_title: `Teacher note for ${selectedCandidate.intent_label}`,
      });
      setNoteText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] -mx-4">
      {/* Left sidebar — review queue */}
      <div className="w-72 shrink-0 bg-zinc-950 border-r border-white/10 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-white/5">
          <SectionHeader className="flex items-center gap-2">
            <Users size={12} /> Review Queue
          </SectionHeader>
        </div>
        <div className="p-3 space-y-2 flex-1">
          {allCandidates.map(c => (
            <div
              key={c.candidate_id}
              onClick={() => setSelectedCandidate(c)}
              className={`p-3 rounded-xl cursor-pointer border-l-4 transition-all ${
                selectedCandidate?.candidate_id === c.candidate_id
                  ? 'bg-white/10'
                  : 'bg-zinc-900/50 hover:bg-zinc-900'
              } ${
                c.policy_route === 'REVIEW_REQUIRED'
                  ? 'border-amber-500'
                  : c.policy_route === 'SIGNAL_INVALID'
                    ? 'border-red-500'
                    : c.provenance === 'SIMULATED'
                      ? 'border-blue-500'
                      : 'border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-white text-sm uppercase">{c.intent_label}</span>
                {c.score !== null && (
                  <MonoLabel className="text-[11px]">{Math.round((c.score) * 100)}%</MonoLabel>
                )}
              </div>
              <StatusBadge status={c.policy_route} size="xs" />
            </div>
          ))}
          {allCandidates.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-zinc-600 text-xs font-mono">No candidates in queue.</p>
              <p className="text-zinc-700 text-[11px] mt-1">Run a fixture on Live page to populate.</p>
            </div>
          )}
          {loading && (
            <p className="text-zinc-600 text-xs font-mono text-center p-4 animate-pulse">Loading…</p>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedCandidate ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Evidence card */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Evidence Card</h2>
                <StatusBadge status={selectedCandidate.policy_route} size="md" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-black/30 p-3 rounded-lg">
                  <SectionHeader className="mb-1">Gesture Intent</SectionHeader>
                  <span className="text-white font-bold uppercase">{selectedCandidate.intent_label}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg">
                  <SectionHeader className="mb-1">Model Score</SectionHeader>
                  <MonoLabel>
                    {selectedCandidate.score !== null
                      ? `${Math.round((selectedCandidate.score) * 100)}% model score`
                      : 'Score unavailable'}
                  </MonoLabel>
                </div>
                <div className="bg-black/30 p-3 rounded-lg">
                  <SectionHeader className="mb-1">Why</SectionHeader>
                  <span className="text-zinc-300 text-xs">{selectedCandidate.why_reason_code ?? '—'}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg">
                  <SectionHeader className="mb-1">Session</SectionHeader>
                  <MonoLabel className="text-[10px]">{selectedCandidate.session_id.slice(0, 16)}…</MonoLabel>
                </div>
              </div>
            </GlassCard>

            {/* Decisions history */}
            {decisions.length > 0 && (
              <GlassCard className="p-5">
                <SectionHeader className="mb-3">Decision History</SectionHeader>
                <div className="space-y-2">
                  {decisions.map(d => (
                    <div key={d.decision_id} className="flex items-center gap-3 text-sm">
                      <StatusBadge status={d.action} size="xs" />
                      <span className="text-zinc-400 text-xs font-mono">{d.final_intent ?? '—'}</span>
                      <span className="text-zinc-600 text-[10px] ml-auto">{new Date(d.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Decision actions */}
            {decisions.length === 0 && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => void handleDecision('CONFIRM')}
                  className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
                >
                  CONFIRM
                </button>
                <button
                  onClick={() => void handleDecision('CORRECT')}
                  className="h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
                >
                  CORRECT
                </button>
                <button
                  onClick={() => void handleDecision('REJECT')}
                  className="h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all"
                >
                  REJECT
                </button>
              </div>
            )}

            {/* Teacher note editor */}
            <GlassCard className="p-5">
              <SectionHeader className="mb-3 flex items-center gap-2">
                <FileText size={12} /> Teacher Note
              </SectionHeader>
              <textarea
                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white text-sm h-24 font-mono focus:outline-none focus:border-violet-500/50 resize-none"
                placeholder={`Enter instructions for ${selectedCandidate.intent_label}…`}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <select
                  className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none"
                  value={noteStatus}
                  onChange={e => setNoteStatus(e.target.value as 'DRAFT' | 'APPROVED')}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="APPROVED">APPROVED</option>
                </select>
                <button
                  onClick={() => void handleSaveNote()}
                  disabled={!noteText.trim()}
                  className="flex items-center gap-1.5 px-4 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
                >
                  <Save size={12} /> SAVE NOTE
                </button>
              </div>
            </GlassCard>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-500 font-mono">Select a candidate to review</p>
            <p className="text-zinc-600 text-xs mt-1">Run a fixture on the Live page to populate the queue.</p>
          </div>
        )}
      </div>
    </div>
  );
}
