import { useState, useEffect, useCallback } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useProfileStore } from '../../stores/profileStore';
import { useLiveStore } from '../../stores/liveStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MonoLabel } from '../../components/common/MonoLabel';
import { ProvenanceChip } from '../../components/common/ProvenanceChip';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { apiGet, apiPost } from '../../api/client';
import { CheckCircle, XCircle, Clock, Lock, Unlock, Play, Zap, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SourceType = 'GLOVE' | 'CAMERA' | 'SIMULATED' | 'REPLAY';

interface QualityCheck {
  // Server returns { id, name } — QualityService.ts line 22-23
  id?: string;
  check_id?: string;     // defensive fallback
  name?: string;
  check_name?: string;   // defensive fallback
  status: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  observed_value: string | null;
  threshold_or_rule?: string | null;
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

// All 11 supported intents from phrase-registry.json
const INTENTS = [
  { id: 'HELP', caption: 'I need help.', emoji: '🆘' },
  { id: 'WATER', caption: 'I need water.', emoji: '💧' },
  { id: 'FOOD', caption: 'I need food.', emoji: '🍽️' },
  { id: 'PAIN', caption: 'I am in pain.', emoji: '😣' },
  { id: 'DOCTOR', caption: 'I need a doctor.', emoji: '🏥' },
  { id: 'MEDICINE', caption: 'I need medicine.', emoji: '💊' },
  { id: 'WASHROOM', caption: 'I need the washroom.', emoji: '🚻' },
  { id: 'YES', caption: 'Yes.', emoji: '✅' },
  { id: 'NO', caption: 'No.', emoji: '❌' },
  { id: 'REPEAT', caption: 'Please repeat.', emoji: '🔁' },
  { id: 'THANK_YOU', caption: 'Thank you.', emoji: '🙏' },
];

const SOURCE_TABS: SourceType[] = ['GLOVE', 'CAMERA', 'SIMULATED', 'REPLAY'];

const CHECK_LABELS: Record<string, string> = {
  SIGNAL_PRESENT: 'Signal Detected',
  FRAME_RATE_SUFFICIENT: 'Frame Rate ≥ 15fps',
  HAND_DETECTED: 'Hand Landmark Found',
  MOTION_RANGE: 'Motion Range ≥ 20px',
};

export function LivePage() {
  const { sourceType, setSourceType } = useSessionStore();
  const { activeProfileId, role, contextType } = useProfileStore();
  const {
    qualityChecks, qualityOverall, candidate, decision, approvedOutput,
    setQualityResult, setCandidate, setDecision, setApprovedOutput, resetLive,
  } = useLiveStore();

  const [session, setSession] = useState<Session | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('fixture-a-success-confirm');
  const [selectedIntent, setSelectedIntent] = useState<string>('HELP');
  const [manualScore, setManualScore] = useState<string>('0.82');
  const [events, setEvents] = useState<Array<{ type: string; label: string; at: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardware connection status
  const [gloveConnected, setGloveConnected] = useState(false);
  const [specsConnected, setSpecsConnected] = useState(false);
  const [hwPolling, setHwPolling] = useState(false);

  const pollHardwareStatus = useCallback(async () => {
    try {
      const [gloveRes, specsRes] = await Promise.all([
        apiGet<{ ok: boolean; connected?: boolean; status?: string }>('/api/bridge/glove/status'),
        apiGet<{ ok: boolean; connected?: boolean; status?: string }>('/api/bridge/specs/status'),
      ]);
      setGloveConnected(gloveRes.connected === true || gloveRes.status === 'connected');
      setSpecsConnected(specsRes.connected === true || specsRes.status === 'connected');
    } catch {
      // Silently handle — hardware might not be available
    }
  }, []);

  useEffect(() => {
    void pollHardwareStatus();
    const interval = setInterval(() => void pollHardwareStatus(), 5000);
    return () => clearInterval(interval);
  }, [pollHardwareStatus]);

  const connectGlove = async () => {
    if (!session || !activeProfileId) return;
    setHwPolling(true);
    try {
      await apiPost('/api/bridge/glove/start', {
        session_id: session.id,
        profile_id: activeProfileId,
      });
      await pollHardwareStatus();
    } catch (err) {
      setError(String(err));
    } finally {
      setHwPolling(false);
    }
  };

  useEffect(() => {
    resetLive();
    setSession(null);
    setEvents([]);
    setError(null);
  }, [sourceType, resetLive]);

  const pushEvent = (type: string, label: string) =>
    setEvents(prev => [...prev, { type, label, at: new Date().toLocaleTimeString() }]);

  const handleNewObservation = () => {
    resetLive();
    setError(null);
    setEvents(prev => [...prev, { type: 'RESET', label: 'Ready for next observation', at: new Date().toLocaleTimeString() }]);
  };

  const startSession = async () => {
    if (!activeProfileId) { setError('No profile selected. Return to home first.'); return; }
    setBusy(true); setError(null);
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
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  };

  const runQualityCheck = async () => {
    if (!session) return;
    setBusy(true); setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (sourceType === 'REPLAY') {
        body['source_type'] = 'REPLAY';
        body['force_quality_pass'] = true;
        if (selectedFixtureId === 'fixture-c-invalid-input') {
          body['force_quality_fail'] = 'SIGNAL_PRESENT';
          body['force_quality_pass'] = false;
        }
      } else if (sourceType === 'SIMULATED') {
        body['source_type'] = 'SIMULATED';
        body['force_quality_pass'] = true;
      }
      const res = await apiPost<{ ok: boolean; quality: { overall: 'PASS' | 'FAIL' | 'NOT_EVALUATED'; checks: QualityCheck[] } }>(
        `/api/sessions/${session.id}/quality/check`, body
      );
      setQualityResult(res.quality.checks, res.quality.overall);
      pushEvent('QUALITY_CHECK', `Quality Gate: ${res.quality.overall}`);
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  };

  const emitObservation = async () => {
    if (!session || qualityOverall !== 'PASS') return;
    setBusy(true); setError(null);
    try {
      let intentLabel = selectedIntent;
      let modelScore: number | null = parseFloat(manualScore) || 0.82;

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
        { intent_label: intentLabel, model_score: modelScore, quality_passed: true, profile_id: activeProfileId, role: role ?? 'STUDENT' }
      );
      setCandidate(res.candidate);
      pushEvent('CANDIDATE_EMITTED', `Candidate: ${res.candidate.intent_label} · ${res.candidate.policy_route}`);
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  };

  const handleDecision = async (action: 'CONFIRM' | 'CORRECT' | 'REJECT' | 'REQUEST_REPEAT') => {
    if (!candidate || !session) return;
    setBusy(true); setError(null);
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
      pushEvent('HUMAN_DECISION', `Decision: ${action}${res.approvedOutput ? ' → caption unlocked' : ''}`);
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  };

  const selectedIntentMeta = INTENTS.find(i => i.id === selectedIntent);

  return (
    <div className="space-y-5">
      {/* Source selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {SOURCE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setSourceType(t)}
              className={`px-4 py-2 text-xs font-mono font-semibold uppercase transition-all ${
                sourceType === t ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
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
              className="rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/50 border border-white/15"
              style={{ background: '#1e293b' }}
              value={selectedFixtureId}
              onChange={e => setSelectedFixtureId(e.target.value)}
            >
              {FIXTURES.map(f => <option key={f.fixture_id} value={f.fixture_id}>{f.label}</option>)}
            </select>
          </>
        )}
        {sourceType === 'SIMULATED' && <ProvenanceChip label="SIMULATED" />}
      </div>

      {/* Hardware Status */}
      <GlassCard className="p-4">
        <SectionHeader className="mb-3">Hardware Status</SectionHeader>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Glove status */}
          <div className="flex items-center gap-2">
            {gloveConnected
              ? <Wifi size={14} className="text-emerald-400" />
              : <WifiOff size={14} className="text-red-400" />}
            <span className={`w-2.5 h-2.5 rounded-full ${gloveConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} />
            <span className="text-xs font-mono text-slate-300">
              Glove: <span className={gloveConnected ? 'text-emerald-400' : 'text-red-400'}>{gloveConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>

          {/* Specs status */}
          <div className="flex items-center gap-2">
            {specsConnected
              ? <Wifi size={14} className="text-emerald-400" />
              : <WifiOff size={14} className="text-red-400" />}
            <span className={`w-2.5 h-2.5 rounded-full ${specsConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} />
            <span className="text-xs font-mono text-slate-300">
              Specs: <span className={specsConnected ? 'text-emerald-400' : 'text-red-400'}>{specsConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>

          {/* Connect Glove button */}
          <button
            onClick={() => void connectGlove()}
            disabled={!session || sourceType === 'SIMULATED' || sourceType === 'REPLAY' || hwPolling}
            className="ml-auto flex items-center gap-2 h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-mono font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {hwPolling ? 'Connecting…' : 'Connect Glove'}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="rounded-lg border border-red-600/30 p-3 text-red-400 text-sm font-mono" style={{ background: 'rgba(220,38,38,0.1)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Left: Input preview + Quality */}
        <div className="col-span-5 space-y-4">
          {/* Input preview */}
          <GlassCard className="h-52 flex flex-col items-center justify-center relative overflow-hidden p-4">
            {session && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-teal-500/30"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {(sourceType === 'REPLAY' || sourceType === 'SIMULATED') && (
              <div className="absolute top-3 right-3">
                <ProvenanceChip label={sourceType === 'REPLAY' ? 'REPLAY' : 'SIMULATED'} />
              </div>
            )}
            {/* Show selected gesture visually */}
            {sourceType !== 'REPLAY' && selectedIntentMeta ? (
              <div className="text-center">
                <div className="text-5xl mb-2">{selectedIntentMeta.emoji}</div>
                <MonoLabel className="text-slate-300 text-base">{selectedIntentMeta.id}</MonoLabel>
                {session && <MonoLabel className="text-teal-400 text-[10px] mt-1">SESSION ACTIVE</MonoLabel>}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2 opacity-40">👋</div>
                <MonoLabel className="text-slate-500">{sourceType}</MonoLabel>
                {session && <MonoLabel className="text-teal-400 text-[10px] mt-1">SESSION ACTIVE</MonoLabel>}
              </div>
            )}
          </GlassCard>

          {/* Quality gate */}
          <GlassCard className="p-4">
            <SectionHeader className="mb-3">Quality Gate</SectionHeader>
            <AnimatePresence>
              {qualityOverall === 'FAIL' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-3 p-3 rounded-lg border-l-4 border-amber-500 text-amber-300 text-sm font-mono"
                  style={{ background: 'rgba(245,158,11,0.1)' }}
                >
                  Quality check failed — recognition paused.
                </motion.div>
              )}
            </AnimatePresence>

            {qualityChecks.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono">Run quality check to validate sensor input.</p>
            ) : (
              <div className="space-y-2">
                {qualityChecks.map((qc, idx) => {
                  // QualityService returns { id, name } — handle both field name styles defensively
                  const checkKey = qc.id ?? qc.check_id ?? String(idx);
                  const checkName = qc.name ?? qc.check_name ?? 'UNKNOWN';
                  return (
                    <div
                      key={checkKey}
                      className={`p-2.5 rounded-lg ${qc.status === 'FAIL' ? 'border-l-4 border-amber-500' : ''}`}
                      style={{ background: 'rgba(30,41,59,0.6)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {qc.status === 'PASS'
                            ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                            : qc.status === 'FAIL'
                              ? <XCircle size={13} className="text-red-500 shrink-0" />
                              : <Clock size={13} className="text-slate-500 shrink-0" />}
                          <span className="text-slate-300 text-xs font-mono">
                            {CHECK_LABELS[checkName] ?? checkName.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <StatusBadge status={qc.status} size="xs" />
                      </div>
                      {qc.status === 'FAIL' && qc.repair_hint && (
                        <p className="text-[11px] text-amber-400 italic mt-1 ml-5">{qc.repair_hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Controls + Candidate + Decision + Output */}
        <div className="col-span-7 space-y-4">
          {/* Session controls */}
          <div className="flex gap-2 flex-wrap items-center">
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
                  className="flex items-center gap-2 h-10 px-4 rounded-lg text-white font-mono text-sm disabled:opacity-50 transition-all border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
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
                {decision && (
                  <button
                    onClick={handleNewObservation}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg text-slate-300 font-mono text-sm transition-all border border-white/10 hover:border-white/20"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <RotateCcw size={13} /> New Observation
                  </button>
                )}
              </>
            )}
          </div>

          {/* Intent + Score picker — visible when SIMULATED and quality PASS and no candidate yet */}
          {session && sourceType !== 'REPLAY' && qualityOverall === 'PASS' && !candidate && (
            <GlassCard className="p-4 space-y-3">
              <SectionHeader>Select Gesture to Emit</SectionHeader>
              <div className="grid grid-cols-4 gap-2">
                {INTENTS.map(intent => (
                  <button
                    key={intent.id}
                    onClick={() => setSelectedIntent(intent.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      selectedIntent === intent.id
                        ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                        : 'border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                    style={{ background: selectedIntent === intent.id ? undefined : 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-xl">{intent.emoji}</span>
                    <span className="text-[10px] font-mono font-semibold">{intent.id}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Model Score:</label>
                <input
                  type="range" min="0.1" max="1" step="0.01"
                  value={parseFloat(manualScore) || 0.82}
                  onChange={e => setManualScore(e.target.value)}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono text-sm text-white w-10 text-right">
                  {Math.round((parseFloat(manualScore) || 0.82) * 100)}%
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  (parseFloat(manualScore) || 0) >= 0.75
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {(parseFloat(manualScore) || 0) >= 0.75 ? '≥ 75% gate' : '< 75% gate'}
                </span>
              </div>
            </GlassCard>
          )}

          {/* Candidate panel */}
          <AnimatePresence>
            {qualityOverall === 'PASS' && candidate && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
                <GlassCard className="p-5 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-4xl">{INTENTS.find(i => i.id === candidate.intent_label)?.emoji ?? '👋'}</span>
                    <h2 className="text-4xl font-extrabold text-white uppercase tracking-wide">
                      {candidate.intent_label}
                    </h2>
                    <div className="flex items-center gap-2 ml-auto">
                      {candidate.score !== null && (
                        <MonoLabel>{Math.round(candidate.score * 100)}% model score</MonoLabel>
                      )}
                      <StatusBadge status={candidate.policy_route} size="md" />
                    </div>
                  </div>
                  {candidate.policy_route === 'REVIEW_REQUIRED' && candidate.score !== null && (
                    <div className="rounded-lg border border-amber-500/30 p-3 text-amber-300 text-sm" style={{ background: 'rgba(245,158,11,0.08)' }}>
                      Model score {Math.round(candidate.score * 100)}% is below the 75% model-score routing gate.
                    </div>
                  )}
                  {candidate.policy_route === 'CANDIDATE_READY' && candidate.score !== null && (
                    <div className="rounded-lg border border-emerald-500/30 p-3 text-emerald-300 text-sm" style={{ background: 'rgba(16,185,129,0.08)' }}>
                      Model score {Math.round(candidate.score * 100)}% meets the 75% model-score routing gate.
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decision buttons */}
          {candidate && !decision && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'CONFIRM', action: 'CONFIRM' as const, cls: 'bg-emerald-600 hover:bg-emerald-500' },
                { label: 'CORRECT', action: 'CORRECT' as const, cls: 'bg-blue-600 hover:bg-blue-500' },
                { label: 'REPEAT', action: 'REQUEST_REPEAT' as const, cls: 'bg-amber-600 hover:bg-amber-500' },
                { label: 'REJECT', action: 'REJECT' as const, cls: 'bg-red-600 hover:bg-red-500' },
              ].map(({ label, action, cls }) => (
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

          {/* Approved output panel */}
          <div aria-live="polite">
            <GlassCard className="p-5 min-h-[80px] flex items-center justify-center">
              {!decision ? (
                <span className="flex items-center gap-2 text-slate-500 font-mono text-sm">
                  <Lock size={15} /> Awaiting human decision — caption locked
                </span>
              ) : approvedOutput ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Unlock size={14} className="text-emerald-400" />
                    <StatusBadge status={decision.action} size="xs" />
                  </div>
                  <p className="text-3xl font-bold text-white" style={{ textShadow: '0 0 24px rgba(16,185,129,0.4)' }}>
                    {approvedOutput.caption_text || approvedOutput.final_intent}
                  </p>
                  <p className="text-slate-500 text-xs font-mono mt-2">Caption approved and unlocked</p>
                </motion.div>
              ) : (
                <span className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                  <StatusBadge status={decision.action} size="xs" />
                  Decision recorded — no caption for this action
                </span>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
          <SectionHeader className="shrink-0 flex items-center mr-2">Timeline</SectionHeader>
          {events.map((e, i) => (
            <span
              key={i}
              className={`shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                e.type === 'HUMAN_DECISION' ? 'border-purple-500/30 text-purple-300' :
                e.type === 'QUALITY_CHECK' ? 'border-blue-500/30 text-blue-300' :
                e.type === 'CANDIDATE_EMITTED' ? 'border-teal-500/30 text-teal-300' :
                e.type === 'RESET' ? 'border-slate-600/30 text-slate-400' :
                'border-slate-700 text-slate-400'
              }`}
              style={{
                background: e.type === 'HUMAN_DECISION' ? 'rgba(139,92,246,0.1)' :
                  e.type === 'QUALITY_CHECK' ? 'rgba(59,130,246,0.1)' :
                  e.type === 'CANDIDATE_EMITTED' ? 'rgba(20,184,166,0.1)' :
                  'rgba(255,255,255,0.03)',
              }}
            >
              ● {e.label} <span className="opacity-50">{e.at}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
