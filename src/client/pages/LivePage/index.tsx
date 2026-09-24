import { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useProfileStore } from '../../stores/profileStore';
import { useLiveStore } from '../../stores/liveStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MonoLabel } from '../../components/common/MonoLabel';
import { ProvenanceChip } from '../../components/common/ProvenanceChip';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { apiPost } from '../../api/client';
import { CheckCircle, XCircle, Clock, Lock, Unlock, Play, Zap, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SourceType = 'GLOVE' | 'CAMERA' | 'SIMULATED' | 'REPLAY';

interface QualityCheck {
  check_id: string;
  check_name: string;
  status: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  observed_value: string | null;
  repair_hint: string | null;
}

interface Candidate {
  candidate_id: string;
  intent_label: string;
  score: number | null;
  policy_route: string;
  why_reason_code: string | null;
}

interface Session {
  id: string;
  source_modality: string;
  provenance: string;
  context: string;
  role: string;
}

interface ApprovedOutput {
  output_id: string;
  final_intent: string;
  caption_text: string;
  locale: string;
}

const FIXTURES = [
  { fixture_id: 'fixture-a-success-confirm', label: 'A: HELP · score 82% · CONFIRM' },
  { fixture_id: 'fixture-b-review-below-gate', label: 'B: WATER · score 68% · REVIEW REQUIRED' },
  { fixture_id: 'fixture-c-invalid-input', label: 'C: Invalid signal · SIGNAL_INVALID' },
  { fixture_id: 'fixture-d-rag-grounded', label: 'D: RAG GROUNDED demo' },
  { fixture_id: 'fixture-e-rag-abstain', label: 'E: RAG ABSTAIN demo' },
  { fixture_id: 'fixture-f-rag-conflict', label: 'F: RAG SOURCES_CONFLICT demo' },
  { fixture_id: 'fixture-g-teach-mode', label: 'G: TEACH mode · REPEAT · CONFIRM' },
];

const SOURCE_TABS: SourceType[] = ['GLOVE', 'CAMERA', 'SIMULATED', 'REPLAY'];

export function LivePage() {
  const { sourceType, setSourceType } = useSessionStore();
  const { activeProfileId, role, contextType } = useProfileStore();
  const { qualityChecks, qualityOverall, candidate, decision, approvedOutput,
    setQualityResult, setCandidate, setDecision, setApprovedOutput, resetLive } = useLiveStore();

  const [session, setSession] = useState<Session | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('fixture-a-success-confirm');
  const [events, setEvents] = useState<Array<{ type: string; label: string; at: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset live state when source changes
  useEffect(() => {
    resetLive();
    setSession(null);
    setEvents([]);
    setError(null);
  }, [sourceType, resetLive]);

  const pushEvent = (type: string, label: string) =>
    setEvents(prev => [...prev, { type, label, at: new Date().toLocaleTimeString() }]);

  const startSession = async () => {
    if (!activeProfileId) { setError('No profile selected. Go back to home.'); return; }
    setBusy(true);
    setError(null);
    try {
      const provenance = sourceType === 'REPLAY' ? 'REPLAY' : sourceType === 'SIMULATED' ? 'SIMULATED' : 'LIVE';
      const res = await apiPost<{ ok: boolean; session: Session }>('/api/sessions', {
        profile_id: activeProfileId,
        context: contextType ?? 'LEARNING_PRACTICE',
        role: role ?? 'STUDENT',
        source_modality: sourceType,
        provenance,
      });
      setSession(res.session);
      pushEvent('SESSION_STARTED', 'Session started');
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const runQualityCheck = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (sourceType === 'REPLAY') {
        body['source_type'] = 'REPLAY';
        body['force_quality_pass'] = true;
        // Fixture C forces a quality fail
        if (selectedFixtureId === 'fixture-c-invalid-input') {
          body['force_quality_fail'] = 'SIGNAL_PRESENT';
          body['force_quality_pass'] = false;
        }
      } else if (sourceType === 'SIMULATED') {
        body['source_type'] = 'SIMULATED';
        body['force_quality_pass'] = true;
      }

      const res = await apiPost<{ ok: boolean; quality: { overall: 'PASS' | 'FAIL' | 'NOT_EVALUATED'; checks: QualityCheck[] } }>(
        `/api/sessions/${session.id}/quality/check`,
        body
      );
      setQualityResult(res.quality.checks, res.quality.overall);
      pushEvent('QUALITY_CHECK', `Quality: ${res.quality.overall}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const emitObservation = async () => {
    if (!session || qualityOverall !== 'PASS') return;
    setBusy(true);
    setError(null);
    try {
      // Determine intent+score from fixture or defaults
      let intentLabel = 'HELP';
      let modelScore: number | null = 0.82;

      if (sourceType === 'REPLAY') {
        const fixtureMap: Record<string, { intent: string; score: number | null }> = {
          'fixture-a-success-confirm': { intent: 'HELP', score: 0.82 },
          'fixture-b-review-below-gate': { intent: 'WATER', score: 0.68 },
          'fixture-g-teach-mode': { intent: 'REPEAT', score: 0.79 },
        };
        const fix = fixtureMap[selectedFixtureId];
        if (fix) { intentLabel = fix.intent; modelScore = fix.score; }
      }

      const res = await apiPost<{ ok: boolean; candidate: Candidate }>(
        `/api/sessions/${session.id}/observation`,
        {
          intent_label: intentLabel,
          model_score: modelScore,
          quality_passed: true,
          profile_id: activeProfileId,
          role: role ?? 'STUDENT',
        }
      );
      setCandidate(res.candidate);
      pushEvent('CANDIDATE_EMITTED', `Candidate: ${res.candidate.intent_label}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (action: 'CONFIRM' | 'CORRECT' | 'REJECT' | 'REQUEST_REPEAT') => {
    if (!candidate || !session) return;
    setBusy(true);
    setError(null);
    try {
      const endpointMap: Record<string, string> = {
        CONFIRM: 'confirm', CORRECT: 'correct', REJECT: 'reject', REQUEST_REPEAT: 'repeat',
      };
      const res = await apiPost<{ ok: boolean; decision: { decision_id: string; action: string; final_intent: string | null }; approvedOutput?: ApprovedOutput }>(
        `/api/candidates/${candidate.candidate_id}/${endpointMap[action]}`,
        {
          actor_role: role ?? 'TEACHER',
          actor_profile_id: activeProfileId,
          session_id: session.id,
          profile_id: activeProfileId,
          context: session.context,
          role: role ?? 'STUDENT',
          provenance: session.provenance,
          final_intent: candidate.intent_label,
        }
      );
      setDecision(res.decision);
      if (res.approvedOutput) setApprovedOutput(res.approvedOutput);
      pushEvent('HUMAN_DECISION', `Decision: ${action}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const DECISION_BUTTONS: Array<{ label: string; action: 'CONFIRM' | 'CORRECT' | 'REJECT' | 'REQUEST_REPEAT'; cls: string }> = [
    { label: 'CONFIRM', action: 'CONFIRM', cls: 'bg-emerald-600 hover:bg-emerald-500' },
    { label: 'CORRECT', action: 'CORRECT', cls: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'REQUEST REPEAT', action: 'REQUEST_REPEAT', cls: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'REJECT', action: 'REJECT', cls: 'bg-red-600 hover:bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Source selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {SOURCE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setSourceType(t)}
              className={`px-4 py-2 text-xs font-mono font-semibold uppercase transition-all ${
                sourceType === t
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {sourceType === 'REPLAY' && (
          <>
            <ProvenanceChip label="REPLAY" />
            <select
              className="bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50"
              value={selectedFixtureId}
              onChange={e => setSelectedFixtureId(e.target.value)}
            >
              {FIXTURES.map(f => (
                <option key={f.fixture_id} value={f.fixture_id}>{f.label}</option>
              ))}
            </select>
          </>
        )}
        {sourceType === 'SIMULATED' && <ProvenanceChip label="SIMULATED" />}
      </div>

      {error && (
        <div className="rounded-lg bg-red-600/15 border border-red-600/30 p-3 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Input preview + Quality */}
        <div className="col-span-5 space-y-4">
          {/* Input preview */}
          <GlassCard className="h-56 flex flex-col items-center justify-center relative overflow-hidden">
            {session && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-teal-500/40"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {(sourceType === 'REPLAY' || sourceType === 'SIMULATED') && (
              <div className="absolute top-3 right-3">
                <ProvenanceChip label={sourceType === 'REPLAY' ? 'REPLAY' : 'SIMULATED'} />
              </div>
            )}
            <Eye size={32} className="text-zinc-700 mb-2" />
            <MonoLabel className="text-zinc-500">{sourceType}</MonoLabel>
            {session && <MonoLabel className="text-teal-400 text-[10px] mt-1">SESSION ACTIVE</MonoLabel>}
          </GlassCard>

          {/* Quality gate panel */}
          <GlassCard className="p-4">
            <SectionHeader className="mb-3">Quality Gate</SectionHeader>

            {/* Recognition paused banner */}
            <AnimatePresence>
              {qualityOverall === 'FAIL' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  aria-live="assertive"
                  className="mb-3 p-3 rounded-lg bg-amber-500/15 border-l-4 border-amber-500 text-amber-300 text-sm font-mono"
                >
                  Quality check failed. Recognition paused.
                </motion.div>
              )}
            </AnimatePresence>

            {qualityChecks.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono">Run quality check to see results.</p>
            ) : (
              <div className="space-y-2">
                {qualityChecks.map(qc => (
                  <div
                    key={qc.check_id}
                    className={`p-2.5 rounded-lg bg-zinc-900/50 ${qc.status === 'FAIL' ? 'border-l-4 border-amber-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {qc.status === 'PASS'
                          ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                          : qc.status === 'FAIL'
                            ? <XCircle size={14} className="text-red-500 shrink-0" />
                            : <Clock size={14} className="text-zinc-500 shrink-0" />}
                        <MonoLabel className="text-zinc-300 text-[11px]">{qc.check_name}</MonoLabel>
                      </div>
                      <StatusBadge status={qc.status} size="xs" />
                    </div>
                    {qc.status === 'FAIL' && qc.repair_hint && (
                      <p className="text-[11px] text-amber-400 italic mt-1 ml-5">{qc.repair_hint}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Controls + Candidate + Decision + Output */}
        <div className="col-span-7 space-y-4">
          {/* Session controls */}
          <div className="flex gap-2 flex-wrap">
            {!session ? (
              <button
                onClick={() => void startSession()}
                disabled={busy}
                className="flex items-center gap-2 h-10 px-5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-mono font-semibold text-sm disabled:opacity-50 transition-all"
              >
                <Play size={14} /> Start Session
              </button>
            ) : (
              <>
                <button
                  onClick={() => void runQualityCheck()}
                  disabled={busy}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-sm disabled:opacity-50 transition-all border border-white/10"
                >
                  <Zap size={14} /> Run Quality Check
                </button>
                {qualityOverall === 'PASS' && !candidate && (
                  <button
                    onClick={() => void emitObservation()}
                    disabled={busy}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm disabled:opacity-50 transition-all"
                  >
                    Emit Observation
                  </button>
                )}
              </>
            )}
          </div>

          {/* Candidate panel — only renders when quality PASS + candidate exists */}
          <AnimatePresence>
            {qualityOverall === 'PASS' && candidate && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                aria-live="polite"
              >
                <GlassCard className="p-6 space-y-4">
                  <h1 className="text-5xl font-extrabold text-white uppercase tracking-wide">
                    {candidate.intent_label}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    {candidate.score !== null && (
                      <MonoLabel>{Math.round((candidate.score) * 100)}% model score</MonoLabel>
                    )}
                    <StatusBadge status={candidate.policy_route} size="md" />
                  </div>
                  {candidate.policy_route === 'REVIEW_REQUIRED' && candidate.score !== null && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-amber-300 text-sm">
                      Model score {Math.round(candidate.score * 100)}% is below the 75% model-score routing gate.
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Human decision bar — 4 buttons h-12, only if candidate and no decision yet */}
          {candidate && !decision && (
            <div className="grid grid-cols-4 gap-2">
              {DECISION_BUTTONS.map(({ label, action, cls }) => (
                <button
                  key={action}
                  onClick={() => void handleDecision(action)}
                  disabled={busy}
                  className={`h-12 rounded-xl text-white font-bold text-xs tracking-wider transition-all disabled:opacity-50 ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Approved output panel — locked until decision */}
          <div aria-live="polite">
            <GlassCard className="p-6 min-h-[90px] flex items-center justify-center">
              {!decision ? (
                <span className="flex items-center gap-2 text-zinc-500 font-mono text-sm">
                  <Lock size={16} />
                  Awaiting human decision
                </span>
              ) : approvedOutput ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Unlock size={14} className="text-emerald-400" />
                    <StatusBadge status={decision.action} size="xs" />
                  </div>
                  <p
                    className="text-3xl font-bold text-white"
                    style={{ textShadow: '0 0 24px rgba(16,185,129,0.4)' }}
                  >
                    {approvedOutput.caption_text || approvedOutput.final_intent}
                  </p>
                </motion.div>
              ) : (
                <span className="flex items-center gap-2 text-zinc-400 font-mono text-sm">
                  <StatusBadge status={decision.action} size="xs" />
                  Decision recorded
                </span>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Session timeline */}
      {events.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-2">
          <SectionHeader className="shrink-0 flex items-center mr-2">Timeline</SectionHeader>
          {events.map((e, i) => (
            <span
              key={i}
              className={`shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                e.type === 'HUMAN_DECISION'
                  ? 'bg-purple-900/30 border-purple-500/30 text-purple-300'
                  : e.type === 'QUALITY_CHECK'
                    ? 'bg-blue-900/30 border-blue-500/30 text-blue-300'
                    : e.type === 'CANDIDATE_EMITTED'
                      ? 'bg-teal-900/30 border-teal-500/30 text-teal-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              ● {e.label} <span className="opacity-50">{e.at}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
