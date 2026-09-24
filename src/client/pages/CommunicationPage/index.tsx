import { useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { apiPost } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import { Volume2, RefreshCw, CheckCircle } from 'lucide-react';

// Valid audio lifecycle status labels from the 26 canonical set
type AudioState = 'NOT_EVALUATED' | 'CANDIDATE_READY' | 'CONFIRMED' | 'NEEDS_REPEAT';

// Audio lifecycle states matching the spec
type AudioLifecycle = 'NOT_TRIGGERED' | 'AUDIO_REQUESTED' | 'AUDIO_STARTED' | 'AUDIO_COMPLETED' | 'AUDIO_FAILED';

interface SessionCandidate {
  intent_label: string;
  policy_route: string;
  caption: string;
  candidate_id: string | null;
}

export function CommunicationPage() {
  const { activeProfileId, contextType } = useProfileStore();
  const [mode, setMode] = useState<'COMMUNICATE' | 'TEACH'>('COMMUNICATE');
  const [audioLifecycle, setAudioLifecycle] = useState<AudioLifecycle>('NOT_TRIGGERED');
  const [_audioEventId, setAudioEventId] = useState<string | null>(null);
  const [recentIntents, setRecentIntents] = useState<string[]>(['WATER', 'HELP', 'FOOD']);
  const [error, setError] = useState<string | null>(null);

  // For demo: show a simulated candidate
  const [candidate] = useState<SessionCandidate | null>({
    intent_label: 'HELP',
    policy_route: 'CANDIDATE_READY',
    caption: 'I need help.',
    candidate_id: null,
  });
  const [decision, setDecision] = useState<AudioState | null>(null);

  const handleDecision = (action: AudioState) => {
    if (candidate) {
      setRecentIntents(prev => [candidate.intent_label, ...prev].slice(0, 8));
    }
    setDecision(action);
  };

  const playAudio = async () => {
    if (!candidate) return;
    setError(null);
    try {
      // Step 1: Request audio
      setAudioLifecycle('AUDIO_REQUESTED');
      const mockOutputId = crypto.randomUUID();
      const res = await apiPost<{ ok: boolean; audioEvent: { audio_event_id: string } }>(
        '/api/audio/request',
        {
          output_id: mockOutputId,
          intent: candidate.intent_label,
          locale: 'en-IN',
          session_id: mockOutputId, // placeholder for demo — real session would come from sessionStore
          profile_id: activeProfileId ?? 'demo',
          context: contextType ?? 'REAL_WORLD_INTERACTION',
          provenance: 'SIMULATED',
        }
      );
      const audioId = res.audioEvent.audio_event_id;
      setAudioEventId(audioId);

      // Step 2: Mark started
      setAudioLifecycle('AUDIO_STARTED');
      await apiPost(`/api/audio/${audioId}/started`);

      // Step 3: Simulate playback then mark completed
      await new Promise(resolve => setTimeout(resolve, 1200));
      setAudioLifecycle('AUDIO_COMPLETED');
      await apiPost(`/api/audio/${audioId}/completed`);
    } catch (err) {
      setAudioLifecycle('AUDIO_FAILED');
      setError(String(err));
    }
  };

  const AUDIO_LIFECYCLE_STATUS_MAP: Record<AudioLifecycle, string> = {
    NOT_TRIGGERED: 'NOT_EVALUATED',
    AUDIO_REQUESTED: 'CANDIDATE_READY',
    AUDIO_STARTED: 'REVIEW_REQUIRED',
    AUDIO_COMPLETED: 'CONFIRMED',
    AUDIO_FAILED: 'FAIL',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-center">
      {/* Mode toggle */}
      <div className="inline-flex bg-zinc-900 rounded-full p-1 border border-white/10">
        {(['COMMUNICATE', 'TEACH'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              mode === m ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-600/10 border border-red-600/30 p-3 text-red-400 text-sm font-mono text-left">
          {error}
        </div>
      )}

      {/* Gesture display */}
      <GlassCard className="py-14 px-8 min-h-[220px] flex flex-col items-center justify-center">
        {candidate && !decision ? (
          <>
            <h1 className="text-4xl font-bold text-white uppercase tracking-widest mb-4">
              {candidate.intent_label}
            </h1>
            <div className="inline-flex items-center gap-3 bg-zinc-900/60 px-4 py-2 rounded-full border border-white/5">
              <span className="text-zinc-300 text-sm">"{candidate.caption}"</span>
              <StatusBadge status={candidate.policy_route} size="xs" />
            </div>
          </>
        ) : decision ? (
          <div className="space-y-2">
            <CheckCircle size={36} className="text-emerald-400 mx-auto" />
            <StatusBadge status={decision} size="md" />
          </div>
        ) : (
          <p className="text-zinc-500 italic font-mono text-sm">Waiting for gesture…</p>
        )}
      </GlassCard>

      {/* Decision bar */}
      {candidate && !decision && (
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => handleDecision('CONFIRMED')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-xl font-bold text-sm transition-all"
          >
            CONFIRM
          </button>
          <button
            onClick={() => handleDecision('NEEDS_REPEAT')}
            className="bg-amber-600 hover:bg-amber-500 text-white h-12 rounded-xl font-bold text-sm transition-all"
          >
            REPEAT
          </button>
          <button
            onClick={() => handleDecision('CONFIRMED')}
            className="bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl font-bold text-sm transition-all"
          >
            CORRECT
          </button>
          <button
            onClick={() => setDecision(null)}
            className="bg-zinc-700 hover:bg-zinc-600 text-white h-12 rounded-xl font-bold text-sm transition-all"
          >
            EVIDENCE
          </button>
        </div>
      )}

      {/* Audio lifecycle panel */}
      <GlassCard className="p-5 text-left">
        <SectionHeader className="mb-3 flex items-center gap-2">
          <Volume2 size={12} /> Audio Lifecycle
        </SectionHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => void playAudio()}
            disabled={audioLifecycle === 'AUDIO_STARTED' || !candidate}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-sm disabled:opacity-50 transition-all border border-white/10"
          >
            <Volume2 size={14} /> PLAY AUDIO
          </button>
          <StatusBadge
            status={AUDIO_LIFECYCLE_STATUS_MAP[audioLifecycle]}
            size="sm"
          />
          <MonoLifecycleLabel state={audioLifecycle} />
          {(audioLifecycle === 'AUDIO_COMPLETED' || audioLifecycle === 'AUDIO_FAILED') && (
            <button
              onClick={() => { setAudioLifecycle('NOT_TRIGGERED'); setAudioEventId(null); }}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
            >
              <RefreshCw size={10} /> Reset
            </button>
          )}
        </div>
      </GlassCard>

      {/* Recent intents */}
      {recentIntents.length > 0 && (
        <div>
          <SectionHeader className="mb-2 text-left">Recent</SectionHeader>
          <div className="flex gap-2 flex-wrap justify-center">
            {recentIntents.map((t, i) => (
              <span
                key={i}
                className="px-4 py-2 rounded-full bg-zinc-900 border border-white/5 text-xs font-mono text-zinc-400 uppercase tracking-wider"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonoLifecycleLabel({ state }: { state: AudioLifecycle }) {
  const colors: Record<AudioLifecycle, string> = {
    NOT_TRIGGERED: 'text-zinc-600',
    AUDIO_REQUESTED: 'text-amber-400',
    AUDIO_STARTED: 'text-blue-400',
    AUDIO_COMPLETED: 'text-emerald-400',
    AUDIO_FAILED: 'text-red-400',
  };
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider ${colors[state]}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}
