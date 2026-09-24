import { useState, useCallback } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProfileStore } from '../../stores/profileStore';
import { Volume2, RotateCcw, CheckCircle, X, BookOpen, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// All 11 intents
const COMM_INTENTS = [
  { id: 'HELP',      caption: 'I need help.',         emoji: '🆘', category: 'EMERGENCY',      color: '#ef4444' },
  { id: 'WATER',     caption: 'I need water.',         emoji: '💧', category: 'BASIC',          color: '#3b82f6' },
  { id: 'FOOD',      caption: 'I need food.',          emoji: '🍽️', category: 'BASIC',          color: '#f59e0b' },
  { id: 'PAIN',      caption: 'I am in pain.',         emoji: '😣', category: 'MEDICAL',        color: '#ef4444' },
  { id: 'DOCTOR',    caption: 'I need a doctor.',      emoji: '🏥', category: 'MEDICAL',        color: '#06b6d4' },
  { id: 'MEDICINE',  caption: 'I need medicine.',      emoji: '💊', category: 'MEDICAL',        color: '#8b5cf6' },
  { id: 'WASHROOM',  caption: 'I need the washroom.',  emoji: '🚻', category: 'BASIC',          color: '#6366f1' },
  { id: 'YES',       caption: 'Yes.',                  emoji: '✅', category: 'CONVERSATIONAL', color: '#10b981' },
  { id: 'NO',        caption: 'No.',                   emoji: '❌', category: 'CONVERSATIONAL', color: '#ef4444' },
  { id: 'REPEAT',    caption: 'Please repeat.',        emoji: '🔁', category: 'ASSISTANCE',     color: '#f59e0b' },
  { id: 'THANK_YOU', caption: 'Thank you.',            emoji: '🙏', category: 'CONVERSATIONAL', color: '#10b981' },
];

// Gesture descriptions for TEACH mode
const GESTURE_HOW: Record<string, string> = {
  HELP:      'Open hand, move side to side rapidly.',
  WATER:     'Three fingers touching thumb, move toward mouth.',
  FOOD:      'Pinched fingers, move toward mouth twice.',
  PAIN:      'Point index fingers together then apart.',
  DOCTOR:    'Tap wrist twice with two fingers.',
  MEDICINE:  'Wiggle middle finger in palm of other hand.',
  WASHROOM:  'Make "T" shape, shake wrist.',
  YES:       'Make fist, nod hand up and down.',
  NO:        'Index and middle finger tap thumb twice.',
  REPEAT:    'Arc hand forward and bring back.',
  THANK_YOU: 'Flat hand from chin, move forward.',
};

interface RecentEntry {
  id: string;
  intent: string;
  caption: string;
  emoji: string;
  at: string;
  status: 'CONFIRMED' | 'REPEATED';
}

// TTS using Web Speech API — available in all modern browsers, no library needed
function speakPhrase(text: string) {
  if (!('speechSynthesis' in window)) return;
  // Cancel any in-progress speech first
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.9;
  utt.pitch = 1.05;
  utt.lang = 'en-IN';
  window.speechSynthesis.speak(utt);
}

export function CommunicationPage() {
  const { role } = useProfileStore();
  const isStaff = role === 'STAFF';

  const [mode, setMode] = useState<'COMMUNICATE' | 'TEACH'>('COMMUNICATE');
  const [currentIntent, setCurrentIntent] = useState<typeof COMM_INTENTS[0] | null>(null);
  const [decision, setDecision] = useState<'CONFIRMED' | 'NEEDS_REPEAT' | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const handleSelect = useCallback((intent: typeof COMM_INTENTS[0]) => {
    setCurrentIntent(intent);
    setDecision(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!currentIntent) return;
    setDecision('CONFIRMED');

    // TTS: speak the caption out loud so staff member (and nearby person) hears it
    setSpeaking(true);
    speakPhrase(currentIntent.caption);
    setTimeout(() => setSpeaking(false), 2000);

    setRecent(prev => [{
      id: crypto.randomUUID(),
      intent: currentIntent.id,
      caption: currentIntent.caption,
      emoji: currentIntent.emoji,
      at: new Date().toLocaleTimeString(),
      status: 'CONFIRMED' as const,
    }, ...prev].slice(0, 8));
  }, [currentIntent]);

  const handleRepeat = useCallback(() => {
    if (!currentIntent) return;
    setDecision('NEEDS_REPEAT');
    // Speak again on repeat
    speakPhrase(currentIntent.caption);
    setRecent(prev => [{
      id: crypto.randomUUID(),
      intent: currentIntent.id,
      caption: currentIntent.caption,
      emoji: currentIntent.emoji,
      at: new Date().toLocaleTimeString(),
      status: 'REPEATED' as const,
    }, ...prev].slice(0, 8));
  }, [currentIntent]);

  const handleCancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setCurrentIntent(null);
    setDecision(null);
    setSpeaking(false);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Staff purpose banner — shown first time or for staff role */}
      {isStaff && showInfo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-400/25 p-4 relative"
          style={{ background: 'rgba(168,85,247,0.08)' }}
        >
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-3 right-3 text-slate-500 hover:text-white"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-purple-200 font-semibold text-sm mb-1">How this works for you (Staff)</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                A deaf or hard-of-hearing person signs a gesture using their glove → their gesture is
                detected → the caption appears on your screen. You can also tap a gesture below to
                <strong className="text-white"> respond back to them</strong> — the phrase will play
                through the <strong className="text-white">speaker out loud</strong> so they can hear it.
                Use <strong className="text-white">TEACH</strong> mode to see how to perform each gesture yourself.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(['COMMUNICATE', 'TEACH'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setCurrentIntent(null); setDecision(null); }}
              className={`px-5 py-2.5 text-sm font-bold transition-all flex items-center gap-2 ${
                mode === m
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={{ background: mode === m ? undefined : 'rgba(255,255,255,0.04)' }}
            >
              {m === 'COMMUNICATE' ? <Volume2 size={14} /> : <BookOpen size={14} />}
              {m}
            </button>
          ))}
        </div>

        {isStaff && (
          <div className="flex items-center gap-2 text-xs font-mono text-purple-300 bg-purple-400/10 border border-purple-400/25 px-3 py-1.5 rounded-full">
            <Volume2 size={12} />
            TTS enabled — phrase plays through speaker on confirm
          </div>
        )}
      </div>

      {/* ─── COMMUNICATE MODE ────────────────────────────────────── */}
      {mode === 'COMMUNICATE' && (
        <div className="space-y-4">
          {/* Active intent display */}
          <AnimatePresence mode="wait">
            {currentIntent ? (
              <motion.div
                key={currentIntent.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl border border-white/10 shrink-0"
                      style={{ background: `${currentIntent.color}20` }}
                    >
                      {currentIntent.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-3xl font-extrabold text-white">{currentIntent.id}</p>
                      <p className="text-slate-300 italic text-lg mt-0.5">"{currentIntent.caption}"</p>
                      {decision && <StatusBadge status={decision === 'CONFIRMED' ? 'CONFIRMED' : 'NEEDS_REPEAT'} size="sm" />}
                    </div>
                  </div>

                  {/* Decision / speaking state */}
                  <div className="mt-5 space-y-3">
                    {speaking && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-purple-300 text-sm font-mono"
                      >
                        <Volume2 size={14} className="animate-pulse" />
                        Speaking: "{currentIntent.caption}"…
                      </motion.div>
                    )}

                    {decision === 'CONFIRMED' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                          <CheckCircle size={16} />
                          Sent · phrase played aloud
                        </div>
                        <button
                          onClick={handleRepeat}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/30 text-amber-300 text-xs font-bold hover:bg-amber-400/10 transition-all"
                        >
                          <RotateCcw size={11} /> REPEAT
                        </button>
                        <button onClick={handleCancel} className="text-slate-500 hover:text-slate-300 text-xs font-mono transition-colors">
                          New
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirm}
                          className="flex items-center gap-2 px-5 h-11 rounded-xl text-white font-bold text-sm transition-all"
                          style={{ background: currentIntent.color }}
                        >
                          <Volume2 size={14} />
                          CONFIRM {isStaff ? '+ SPEAK' : ''}
                        </button>
                        <button
                          onClick={handleRepeat}
                          className="flex items-center gap-2 px-4 h-11 rounded-xl border border-amber-400/30 text-amber-300 font-bold text-sm hover:bg-amber-400/10 transition-all"
                        >
                          <RotateCcw size={14} /> REPEAT
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 h-11 rounded-xl border border-white/10 text-slate-400 font-bold text-sm hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <GlassCard className="h-32 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl mb-2">👋</p>
                    <p className="text-slate-400 text-sm">Select a gesture below to communicate</p>
                    {isStaff && (
                      <p className="text-slate-600 text-xs mt-1">Tap any gesture → it will speak out loud for the person with you</p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gesture grid */}
          <div>
            <SectionHeader className="mb-3">Communication Board</SectionHeader>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {COMM_INTENTS.map(intent => (
                <button
                  key={intent.id}
                  onClick={() => handleSelect(intent)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    currentIntent?.id === intent.id
                      ? 'border-white/30 scale-[1.03]'
                      : 'border-white/8 hover:border-white/20 hover:scale-[1.02]'
                  }`}
                  style={{
                    background: currentIntent?.id === intent.id
                      ? `${intent.color}25`
                      : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="text-3xl">{intent.emoji}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-300 uppercase leading-tight text-center">
                    {intent.id.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent communications */}
          {recent.length > 0 && (
            <div>
              <SectionHeader className="mb-2">Recent</SectionHeader>
              <div className="flex gap-2 flex-wrap">
                {recent.map(r => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${
                      r.status === 'CONFIRMED'
                        ? 'border-emerald-500/30 text-emerald-300'
                        : 'border-amber-500/30 text-amber-300'
                    }`}
                    style={{ background: r.status === 'CONFIRMED' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.intent}</span>
                    <span className="text-slate-600">{r.at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TEACH MODE ──────────────────────────────────────────── */}
      {mode === 'TEACH' && (
        <div className="space-y-4">
          <GlassCard className="p-4 border border-cyan-400/15">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-cyan-400" />
              <SectionHeader>Gesture Reference Guide</SectionHeader>
            </div>
            <p className="text-slate-400 text-xs">
              {isStaff
                ? 'Use this to understand what gestures the deaf/hard-of-hearing person is performing. Each entry shows the gesture name, its caption, and how to perform it.'
                : 'Reference guide for all supported gestures with performance instructions.'}
            </p>
          </GlassCard>

          <div className="grid grid-cols-1 gap-3">
            {COMM_INTENTS.map(intent => (
              <GlassCard key={intent.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shrink-0"
                    style={{ background: `${intent.color}15` }}
                  >
                    {intent.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-white uppercase text-base">{intent.id.replace('_', ' ')}</span>
                      <span className="text-xs font-mono text-slate-500 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {intent.category}
                      </span>
                    </div>
                    <p className="text-slate-300 italic text-sm mb-1">"{intent.caption}"</p>
                    <p className="text-slate-500 text-xs">
                      <span className="text-slate-400 font-semibold">How to sign: </span>
                      {GESTURE_HOW[intent.id] ?? 'See reference card.'}
                    </p>
                  </div>
                  <button
                    onClick={() => speakPhrase(intent.caption)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition-colors shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                    title="Preview audio"
                  >
                    <Volume2 size={12} />
                    Hear
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
