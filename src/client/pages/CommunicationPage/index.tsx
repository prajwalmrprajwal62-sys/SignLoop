import { useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';

import { Volume2, RotateCcw, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// All 11 intents the communication board supports
const COMM_INTENTS = [
  { id: 'HELP',      caption: 'I need help.',         emoji: '🆘', category: 'EMERGENCY', color: '#ef4444' },
  { id: 'WATER',     caption: 'I need water.',        emoji: '💧', category: 'BASIC',     color: '#3b82f6' },
  { id: 'FOOD',      caption: 'I need food.',         emoji: '🍽️', category: 'BASIC',     color: '#f59e0b' },
  { id: 'PAIN',      caption: 'I am in pain.',        emoji: '😣', category: 'MEDICAL',   color: '#ef4444' },
  { id: 'DOCTOR',    caption: 'I need a doctor.',     emoji: '🏥', category: 'MEDICAL',   color: '#06b6d4' },
  { id: 'MEDICINE',  caption: 'I need medicine.',     emoji: '💊', category: 'MEDICAL',   color: '#8b5cf6' },
  { id: 'WASHROOM',  caption: 'I need the washroom.', emoji: '🚻', category: 'BASIC',     color: '#6366f1' },
  { id: 'YES',       caption: 'Yes.',                 emoji: '✅', category: 'CONVERSATIONAL', color: '#10b981' },
  { id: 'NO',        caption: 'No.',                  emoji: '❌', category: 'CONVERSATIONAL', color: '#ef4444' },
  { id: 'REPEAT',    caption: 'Please repeat.',       emoji: '🔁', category: 'ASSISTANCE', color: '#f59e0b' },
  { id: 'THANK_YOU', caption: 'Thank you.',           emoji: '🙏', category: 'CONVERSATIONAL', color: '#10b981' },
];

const CATEGORY_COLORS: Record<string, string> = {
  EMERGENCY:     'text-red-300 border-red-500/30',
  BASIC:         'text-blue-300 border-blue-500/30',
  MEDICAL:       'text-orange-300 border-orange-500/30',
  CONVERSATIONAL:'text-teal-300 border-teal-500/30',
  ASSISTANCE:    'text-purple-300 border-purple-500/30',
};

interface RecentEntry {
  id: string;
  intent: string;
  caption: string;
  emoji: string;
  at: string;
  status: 'CONFIRMED' | 'REPEATED';
}

export function CommunicationPage() {

  const [mode, setMode] = useState<'COMMUNICATE' | 'TEACH'>('COMMUNICATE');
  const [currentIntent, setCurrentIntent] = useState<typeof COMM_INTENTS[0] | null>(null);
  const [decision, setDecision] = useState<'CONFIRMED' | 'NEEDS_REPEAT' | null>(null);
  const [audioState, setAudioState] = useState<'IDLE' | 'PLAYING' | 'DONE'>('IDLE');
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  const handleSelectIntent = (intent: typeof COMM_INTENTS[0]) => {
    setCurrentIntent(intent);
    setDecision(null);
    setAudioState('IDLE');
  };

  const handleConfirm = () => {
    if (!currentIntent) return;
    setDecision('CONFIRMED');
    // Simulate audio playback locally — no API call needed for demo
    setAudioState('PLAYING');
    setTimeout(() => setAudioState('DONE'), 1500);
    setRecent(prev => [{
      id: crypto.randomUUID(),
      intent: currentIntent.id,
      caption: currentIntent.caption,
      emoji: currentIntent.emoji,
      at: new Date().toLocaleTimeString(),
      status: 'CONFIRMED' as const,
    }, ...prev].slice(0, 8));
  };

  const handleRepeat = () => {
    if (!currentIntent) return;
    setDecision('NEEDS_REPEAT');
    setRecent(prev => [{
      id: crypto.randomUUID(),
      intent: currentIntent.id,
      caption: currentIntent.caption,
      emoji: currentIntent.emoji,
      at: new Date().toLocaleTimeString(),
      status: 'REPEATED' as const,
    }, ...prev].slice(0, 8));
  };

  const handleReset = () => {
    setCurrentIntent(null);
    setDecision(null);
    setAudioState('IDLE');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl p-1 border border-white/10" style={{ background: 'rgba(30,41,59,0.8)' }}>
          {(['COMMUNICATE', 'TEACH'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === m
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'COMMUNICATE' ? '💬 COMMUNICATE' : '📖 TEACH'}
            </button>
          ))}
        </div>
      </div>

      {/* Main communication display */}
      <GlassCard className="p-6">
        <AnimatePresence mode="wait">
          {!currentIntent ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-3 opacity-30">👋</div>
              <p className="text-slate-500 font-mono text-sm">
                {mode === 'COMMUNICATE'
                  ? 'Select a gesture below to communicate'
                  : 'TEACH MODE — select an intent to demonstrate to students'}
              </p>
            </motion.div>
          ) : decision === 'CONFIRMED' ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="text-6xl">{currentIntent.emoji}</div>
              <p
                className="text-4xl font-extrabold"
                style={{ color: currentIntent.color }}
              >
                {currentIntent.caption}
              </p>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-emerald-400 font-mono text-sm font-semibold">CONFIRMED</span>
                {audioState === 'PLAYING' && (
                  <span className="flex items-center gap-1 text-cyan-400 text-xs font-mono">
                    <Volume2 size={12} className="animate-pulse" /> Playing audio…
                  </span>
                )}
                {audioState === 'DONE' && (
                  <span className="text-slate-500 text-xs font-mono">Audio complete</span>
                )}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm font-mono transition-all"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <RotateCcw size={12} /> Next
              </button>
            </motion.div>
          ) : decision === 'NEEDS_REPEAT' ? (
            <motion.div
              key="repeat"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-6 space-y-3"
            >
              <div className="text-5xl opacity-50">{currentIntent.emoji}</div>
              <p className="text-amber-300 font-bold text-xl">🔁 Please repeat the gesture</p>
              <StatusBadge status="NEEDS_REPEAT" size="md" />
              <button
                onClick={handleReset}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg border border-amber-500/30 text-amber-300 text-sm font-mono transition-all"
                style={{ background: 'rgba(245,158,11,0.08)' }}
              >
                <RotateCcw size={12} /> Start over
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="candidate"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-4 space-y-4"
            >
              <div className="text-6xl">{currentIntent.emoji}</div>
              <div>
                <h2 className="text-4xl font-extrabold text-white uppercase tracking-wide">
                  {currentIntent.id}
                </h2>
                <p className="text-slate-400 text-lg mt-1 italic">"{currentIntent.caption}"</p>
              </div>
              <StatusBadge status="CANDIDATE_READY" size="md" />
              {/* Decision buttons */}
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
                >
                  <CheckCircle size={15} /> CONFIRM
                </button>
                <button
                  onClick={handleRepeat}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all"
                >
                  🔁 REPEAT
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm font-mono transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Gesture grid — the communication board */}
      <div>
        <SectionHeader className="mb-3">Communication Board</SectionHeader>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {COMM_INTENTS.map(intent => (
            <button
              key={intent.id}
              onClick={() => handleSelectIntent(intent)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                currentIntent?.id === intent.id
                  ? `${CATEGORY_COLORS[intent.category] ?? ''} bg-white/10`
                  : 'border-white/8 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
              style={{
                background: currentIntent?.id === intent.id ? `${intent.color}15` : 'rgba(255,255,255,0.03)',
              }}
              title={intent.caption}
            >
              <span className="text-3xl">{intent.emoji}</span>
              <span className="text-[10px] font-mono font-bold uppercase">{intent.id.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent communications */}
      {recent.length > 0 && (
        <div>
          <SectionHeader className="mb-3">
            <Clock size={12} className="inline mr-1" /> Recent Communications
          </SectionHeader>
          <div className="flex gap-2 flex-wrap">
            {recent.map(r => (
              <div
                key={r.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono ${
                  r.status === 'CONFIRMED'
                    ? 'border-emerald-500/25 text-emerald-300'
                    : 'border-amber-500/25 text-amber-300'
                }`}
                style={{ background: r.status === 'CONFIRMED' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold">{r.intent}</span>
                <span className="opacity-50">{r.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'TEACH' && (
        <div className="rounded-2xl border border-violet-500/20 p-4" style={{ background: 'rgba(139,92,246,0.06)' }}>
          <p className="text-violet-300 text-sm font-semibold mb-1">📖 TEACH MODE</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            In Teach Mode, you can demonstrate any gesture intent to a student or community worker.
            Select an intent above, confirm it, and the audio phrase will play so the listener can hear the correct caption.
            This is the "Teach" operating mode of the communication system — not a new product.
          </p>
        </div>
      )}
    </div>
  );
}
