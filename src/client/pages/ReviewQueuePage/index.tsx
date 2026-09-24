import { useEffect, useState } from 'react';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { CheckCircle, XCircle, RotateCcw, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewItem {
  candidate_id: string;
  intent_label: string;
  score: number | null;
  policy_route: string;
  why_reason_code: string | null;
  created_at: string;
  session_id: string;
  profile_id: string;
  context: string;
  provenance: string;
  pseudonymous_code: string;
  profile_role: string;
}

interface Decision {
  decision_id: string;
  action: string;
  final_intent: string | null;
  created_at: string;
}

const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

export function ReviewQueuePage() {
  const { activeProfileId, contextType } = useProfileStore();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadQueue = () => {
    setLoading(true);
    apiGet<{ ok: boolean; reviewItems: ReviewItem[] }>('/api/candidates/teacher/review-queue')
      .then(res => setItems(res.reviewItems ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  useEffect(() => {
    if (!selected) { setDecisions([]); return; }
    apiGet<{ ok: boolean; decisions: Decision[] }>(`/api/candidates/${selected.candidate_id}/decisions`)
      .then(res => setDecisions(res.decisions ?? []))
      .catch(console.error);
  }, [selected]);

  const handleDecision = async (action: 'CONFIRM' | 'CORRECT' | 'REJECT') => {
    if (!selected || !activeProfileId) return;
    setBusy(true);
    try {
      const endpointMap = { CONFIRM: 'confirm', CORRECT: 'correct', REJECT: 'reject' };
      await apiPost(`/api/candidates/${selected.candidate_id}/${endpointMap[action]}`, {
        actor_role: 'TEACHER',
        actor_profile_id: activeProfileId,
        session_id: selected.session_id,
        profile_id: selected.profile_id,
        context: selected.context ?? contextType ?? 'LEARNING_PRACTICE',
        role: 'TEACHER',
        provenance: selected.provenance ?? 'LIVE',
        final_intent: selected.intent_label,
      });
      setMsg(`Decision recorded: ${action} for ${selected.intent_label} (${selected.pseudonymous_code})`);
      // Remove from queue and move on
      setItems(prev => prev.filter(i => i.candidate_id !== selected.candidate_id));
      setSelected(null);
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg(`Error: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selected || !activeProfileId) return;
    setBusy(true);
    try {
      await apiPost('/api/knowledge/sources', {
        source_class: 'TEACHER_KNOWLEDGE',
        profile_id: selected.profile_id,     // scoped to THIS student only
        intent_id: selected.intent_label,
        author_id: activeProfileId,
        author_role: 'TEACHER',
        content: noteText.trim(),
        content_type: 'text/plain',
        locale: 'en-IN',
        consent_scope: selected.context ?? 'LEARNING_PRACTICE',
        retention_class: 'PERMANENT_AUDIT',
        supersedes_id: null,
        session_id: selected.session_id,
        event_id: null,
        task_id: null,
        context: selected.context ?? 'LEARNING_PRACTICE',
        source_title: `Review note: ${selected.intent_label} for ${selected.pseudonymous_code}`,
      });
      setNoteText('');
      setMsg(`Note saved for ${selected.pseudonymous_code} → their tutor will now cite it`);
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg(`Note save failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Review Queue</h1>
        <p className="text-slate-500 text-sm mt-1">
          When a student's gesture scores below the 75% routing gate, it lands here for your review.
          Your CONFIRM/CORRECT/REJECT decision and any notes you add go directly to that student.
        </p>
      </div>

      {/* Flow explanation */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-slate-400">
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Student signs gesture</span>
        <ArrowRight size={12} />
        <span className="px-2 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">Score &lt; 75% → REVIEW_REQUIRED</span>
        <ArrowRight size={12} />
        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Appears here</span>
        <ArrowRight size={12} />
        <span className="px-2 py-1 rounded bg-violet-400/10 border border-violet-400/30 text-violet-300">Teacher decides + notes</span>
        <ArrowRight size={12} />
        <span className="px-2 py-1 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">Student's RAG tutor cites your note</span>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-500/30 p-3 text-sm font-mono text-emerald-300"
          style={{ background: 'rgba(16,185,129,0.08)' }}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Queue sidebar */}
        <div className="col-span-5 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <SectionHeader>Pending ({items.length})</SectionHeader>
            <button onClick={loadQueue} className="text-slate-500 hover:text-slate-300 text-xs font-mono transition-colors">
              ↺ Refresh
            </button>
          </div>

          {loading && (
            <p className="text-slate-500 text-xs font-mono animate-pulse py-4 text-center">
              Loading review queue…
            </p>
          )}

          {!loading && items.length === 0 && (
            <GlassCard className="p-8 text-center">
              <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-300 font-semibold text-sm">Queue is clear!</p>
              <p className="text-slate-500 text-xs mt-1">
                No REVIEW_REQUIRED candidates right now.
                When a student's gesture scores below 75%, it will appear here.
              </p>
            </GlassCard>
          )}

          {items.map(item => (
            <button
              key={item.candidate_id}
              onClick={() => { setSelected(item); setNoteText(''); }}
              className={`w-full text-left p-4 rounded-2xl border-l-4 border transition-all ${
                selected?.candidate_id === item.candidate_id
                  ? 'border-l-amber-400 border-white/15 bg-white/8'
                  : 'border-l-amber-500/60 border-white/6 hover:border-white/12'
              }`}
              style={{ background: selected?.candidate_id === item.candidate_id ? undefined : 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{GESTURE_EMOJI[item.intent_label] ?? '👋'}</span>
                <span className="font-bold text-white uppercase text-sm flex-1">{item.intent_label}</span>
                {item.score !== null && (
                  <span className={`text-xs font-mono font-bold ${item.score >= 0.75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {Math.round(item.score * 100)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded">
                  {item.pseudonymous_code}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  {new Date(item.created_at).toLocaleTimeString()}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-7">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.candidate_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-4"
              >
                {/* Evidence card */}
                <GlassCard className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      {GESTURE_EMOJI[selected.intent_label] ?? '👋'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl font-extrabold text-white uppercase">
                          {selected.intent_label}
                        </span>
                        <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-400/15 border border-violet-400/30 text-violet-300">
                          {selected.pseudonymous_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <StatusBadge status="REVIEW_REQUIRED" size="xs" />
                        {selected.score !== null && (
                          <span className="text-sm font-mono text-amber-300">
                            {Math.round(selected.score * 100)}% model score — below 75% routing gate
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { label: 'Student', value: selected.pseudonymous_code },
                      { label: 'Provenance', value: selected.provenance },
                      { label: 'Context', value: selected.context?.replace(/_/g, ' ') ?? '—' },
                      { label: 'Why', value: selected.why_reason_code ?? 'SCORE_BELOW_GATE' },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-slate-500 uppercase tracking-wider text-[10px]">{label}</p>
                        <p className="text-slate-200 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Decision buttons — only if no decision made yet */}
                {decisions.length === 0 ? (
                  <div>
                    <p className="text-xs font-mono text-slate-500 mb-2">
                      Make a decision — this will be permanently recorded:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => void handleDecision('CONFIRM')}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 transition-all"
                      >
                        <CheckCircle size={14} /> CONFIRM
                      </button>
                      <button
                        onClick={() => void handleDecision('CORRECT')}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50 transition-all"
                      >
                        <RotateCcw size={14} /> CORRECT
                      </button>
                      <button
                        onClick={() => void handleDecision('REJECT')}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 transition-all"
                      >
                        <XCircle size={14} /> REJECT
                      </button>
                    </div>
                  </div>
                ) : (
                  <GlassCard className="p-4">
                    <SectionHeader className="mb-2">Decision Recorded</SectionHeader>
                    {decisions.map(d => (
                      <div key={d.decision_id} className="flex items-center gap-2">
                        <StatusBadge status={d.action} size="xs" />
                        <span className="text-slate-400 text-xs font-mono">{d.final_intent ?? '—'}</span>
                      </div>
                    ))}
                  </GlassCard>
                )}

                {/* Teacher note — scoped to this student */}
                <GlassCard className="p-5 border border-violet-400/15">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={13} className="text-violet-400" />
                    <SectionHeader>Add a note for {selected.pseudonymous_code}</SectionHeader>
                  </div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-300 font-mono">
                      Scoped to {selected.pseudonymous_code} only — other students cannot see this note
                    </p>
                  </div>
                  <textarea
                    className="w-full rounded-xl p-3 text-white text-sm h-20 font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                    placeholder={`Write what ${selected.pseudonymous_code} should practice for ${selected.intent_label}…`}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <button
                    onClick={() => void handleSaveNote()}
                    disabled={!noteText.trim() || busy}
                    className="mt-2 flex items-center gap-1.5 px-5 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
                  >
                    Save Note → {selected.pseudonymous_code}'s RAG Tutor
                  </button>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 text-center"
              >
                <AlertTriangle size={36} className="text-slate-700 mb-3" />
                <p className="text-slate-500 font-mono text-sm">Select a case from the queue</p>
                <p className="text-slate-600 text-xs mt-1 max-w-xs">
                  When a student's gesture is below the 75% routing gate, it will appear in the list.
                  Run a SIMULATED session on the LIVE page as a student to populate this queue.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
