import { useEffect, useState } from 'react';
import { TutorPanel } from '../../components/tutor/TutorPanel';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet } from '../../api/client';
import { Target, ChevronRight, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PracticeTask {
  task_id: string;
  profile_id: string;
  intent_id: string;
  instruction: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
  target_repetitions: number;
  completed_repetitions: number;
  due_at: string | null;
}

// Gesture visual data — matches phrase-registry.json
const GESTURE_META: Record<string, { emoji: string; caption: string; description: string; color: string }> = {
  HELP:      { emoji: '🆘', caption: 'I need help.',         description: 'Closed fist with thumb up, resting on open palm — lift gently together.',     color: '#ef4444' },
  WATER:     { emoji: '💧', caption: 'I need water.',        description: 'Three fingers (W shape) tapped near mouth or chin.',                           color: '#3b82f6' },
  FOOD:      { emoji: '🍽️', caption: 'I need food.',         description: 'Flattened O-handshape, fingertips brought toward lips repeatedly.',            color: '#f59e0b' },
  PAIN:      { emoji: '😣', caption: 'I am in pain.',        description: 'Index fingers pointed and twisted slightly near area of discomfort.',           color: '#ef4444' },
  DOCTOR:    { emoji: '🏥', caption: 'I need a doctor.',     description: 'Bent fingertips tapping the inner wrist pulse point.',                         color: '#06b6d4' },
  MEDICINE:  { emoji: '💊', caption: 'I need medicine.',     description: 'Middle finger tip circling on open palm — like grinding mortar and pestle.',    color: '#8b5cf6' },
  WASHROOM:  { emoji: '🚻', caption: 'I need the washroom.', description: 'T-handshape (thumb between index/middle fingers) shaken side to side.',         color: '#6366f1' },
  YES:       { emoji: '✅', caption: 'Yes.',                 description: 'Closed fist nodding up and down, imitating a head nod.',                       color: '#10b981' },
  NO:        { emoji: '❌', caption: 'No.',                  description: 'Index and middle fingers snapping down onto thumb repeatedly.',                  color: '#ef4444' },
  REPEAT:    { emoji: '🔁', caption: 'Please repeat.',       description: 'Bent open hand moving in an arc back towards the body.',                        color: '#f59e0b' },
  THANK_YOU: { emoji: '🙏', caption: 'Thank you.',           description: 'Flat open hand from chin, moving outward toward the other person.',             color: '#10b981' },
};

const PRIORITY_COLORS = {
  HIGH:   'text-red-400 border-red-400/30 bg-red-400/10',
  MEDIUM: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  LOW:    'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
};

interface TeacherMessage {
  source_id: string;
  intent_id: string | null;
  content: string;
  author_id: string | null;
  created_at: string;
}

export function PracticePage() {
  const { activeProfileId, role, contextType } = useProfileStore();
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutor, setShowTutor] = useState(false);
  const [teacherMessages, setTeacherMessages] = useState<TeacherMessage[]>([]);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    apiGet<{ ok: boolean; tasks: PracticeTask[] }>(`/api/practice/tasks?profile_id=${activeProfileId}`)
      .then(res => setTasks(res.tasks ?? []))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Fetch teacher-authored knowledge sources for this student
  useEffect(() => {
    if (!activeProfileId) return;
    apiGet<{ ok: boolean; sources: TeacherMessage[] }>(`/api/knowledge/sources?profile_id=${activeProfileId}`)
      .then(res => {
        // Filter to TEACHER_KNOWLEDGE source_class on the client side
        const notes = (res.sources ?? []).filter(
          (s: TeacherMessage & { source_class?: string }) => s.source_class === 'TEACHER_KNOWLEDGE'
        );
        setTeacherMessages(notes);
      })
      .catch(() => setTeacherMessages([]));
  }, [activeProfileId]);

  const activeTask = tasks[0] ?? null;
  const otherTasks = tasks.slice(1);
  const completedReps = activeTask?.completed_repetitions ?? 0;
  const targetReps = activeTask?.target_repetitions ?? 5;
  const meta = activeTask ? (GESTURE_META[activeTask.intent_id] ?? null) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500 font-mono text-sm animate-pulse">Loading your practice tasks…</p>
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-600/30 p-4 text-red-400 text-sm font-mono" style={{ background: 'rgba(220,38,38,0.08)' }}>
      {error}
    </div>
  );

  if (!activeProfileId) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500 font-mono text-sm">No profile selected. Return to home.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Always-visible tutor banner at the top */}
      <div
        className="rounded-2xl border border-violet-500/30 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-violet-500/50 transition-all"
        style={{ background: 'rgba(139,92,246,0.07)' }}
        onClick={() => setShowTutor(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <p className="text-violet-200 font-bold text-sm">Teacher-Grounded Tutor</p>
            <p className="text-slate-400 text-xs">Answers grounded in your teacher's notes and approved training</p>
          </div>
        </div>
        <span className="text-violet-400 text-xs font-mono font-semibold border border-violet-500/30 rounded-lg px-3 py-1.5 bg-violet-500/10">
          {showTutor ? 'HIDE ▲' : 'ASK TUTOR ▼'}
        </span>
      </div>

      {/* Tutor panel — always togglable, not buried inside task card */}
      {showTutor && (
        <TutorPanel
          profileId={activeProfileId ?? ''}
          contextType={contextType ?? 'LEARNING_PRACTICE'}
          role={role ?? 'STUDENT'}
          consentGranted={true}
          intentId={activeTask?.intent_id}
        />
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — Active practice task (visual heavy) */}
        <div className="col-span-7 space-y-5">
          {activeTask && meta ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* GESTURE VISUAL — this is the core student experience */}
              <GlassCard className="p-8 text-center space-y-5">
                {/* Priority badge */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold uppercase ${PRIORITY_COLORS[activeTask.priority]}`}>
                    {activeTask.priority} PRIORITY
                  </span>
                  <StatusBadge status={activeTask.status} size="xs" />
                </div>

                {/* Big gesture visual */}
                <div
                  className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto text-6xl shadow-lg"
                  style={{ background: `${meta.color}18`, border: `2px solid ${meta.color}40` }}
                >
                  {meta.emoji}
                </div>

                {/* Gesture name — large and bold */}
                <div>
                  <h1 className="text-5xl font-extrabold text-white uppercase tracking-wide">
                    {activeTask.intent_id}
                  </h1>
                  <p className="text-slate-400 text-lg mt-1 italic">"{meta.caption}"</p>
                </div>

                {/* Gesture description — how to perform it */}
                <div className="mx-auto max-w-sm rounded-2xl border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">How to sign it</p>
                  <p className="text-slate-200 text-sm leading-relaxed">{meta.description}</p>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: targetReps }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        i < completedReps
                          ? 'shadow-[0_0_10px_rgba(45,226,230,0.7)]'
                          : 'border-2 border-slate-600'
                      }`}
                      style={i < completedReps ? { background: meta.color } : undefined}
                    />
                  ))}
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    {completedReps} / {targetReps} completed
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
                  <button
                    className="h-14 rounded-2xl text-slate-950 font-extrabold text-base tracking-wider w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)` }}
                  >
                    PRACTICE NOW
                  </button>
                  <button
                    onClick={() => setShowTutor(v => !v)}
                    className="border border-violet-500/30 bg-violet-500/10 text-violet-300 h-11 rounded-xl text-sm font-semibold transition-all hover:bg-violet-500/15"
                  >
                    {showTutor ? 'HIDE TUTOR' : 'ASK TUTOR'}
                  </button>
                </div>
              </GlassCard>

              {/* Teacher's instruction — prominently shown */}
              {activeTask.instruction && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-2xl border border-amber-500/25 p-5"
                  style={{ background: 'rgba(245,158,11,0.07)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">👩‍🏫 Teacher's Instruction</span>
                  </div>
                  <p className="text-amber-100 text-sm leading-relaxed">
                    "{activeTask.instruction}"
                  </p>
                  <p className="text-amber-400/50 text-xs font-mono mt-2">From your assigned teacher · LEARNING_PRACTICE</p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <GlassCard className="p-10 flex flex-col items-center text-center gap-4">
              <Target size={44} className="text-slate-600" />
              <div>
                <p className="text-slate-300 font-semibold text-lg">No active practice tasks</p>
                <p className="text-slate-500 text-sm mt-1">Your teacher will assign tasks to your profile. Use the tutor above to explore or ask questions.</p>
              </div>
            </GlassCard>
          )}

          {/* Other assigned tasks */}
          {otherTasks.length > 0 && (
            <div>
              <SectionHeader className="mb-3">Other Assigned Tasks</SectionHeader>
              <div className="space-y-2">
                {otherTasks.map(t => {
                  const m = GESTURE_META[t.intent_id];
                  return (
                    <GlassCard key={t.task_id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {m && <span className="text-2xl">{m.emoji}</span>}
                        <div>
                          <span className="font-bold text-white uppercase text-sm">{t.intent_id}</span>
                          {t.instruction && (
                            <p className="text-slate-500 text-xs mt-0.5 italic">
                              {t.instruction.length > 60 ? t.instruction.slice(0, 57) + '…' : t.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {t.completed_repetitions}/{t.target_repetitions}
                        </span>
                        <StatusBadge status={t.status} size="xs" />
                        <ChevronRight size={14} className="text-slate-600" />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — All 11 gestures reference panel in grid */}
        <div className="col-span-5 space-y-3">
          <SectionHeader>Sign Language Reference</SectionHeader>
          <p className="text-slate-500 text-xs mb-2">All 11 gestures you can sign with the glove</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(GESTURE_META).map(([key, g]) => (
              <div
                key={key}
                className="rounded-xl border p-2.5 flex items-start gap-2 transition-all hover:border-white/20 relative"
                style={{
                  background: `${g.color}09`,
                  borderColor: `${g.color}30`,
                }}
              >
                <span className="text-xl shrink-0">{g.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-bold text-white text-[11px] uppercase">{key}</span>
                    {activeTask?.intent_id === key && (
                      <span className="text-[8px] font-mono bg-violet-500/20 text-violet-300 px-1 py-0.5 rounded border border-violet-500/30">NOW</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[10px] italic leading-tight mt-0.5 line-clamp-1">"{g.caption}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Messages */}
      <div className="rounded-2xl border-2 border-violet-500/30">
        <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={16} className="text-violet-400" />
          <SectionHeader>Teacher Messages</SectionHeader>
        </div>
        {teacherMessages.length === 0 ? (
          <p className="text-slate-500 text-sm font-mono">No teacher messages yet</p>
        ) : (
          <div className="space-y-3">
            {teacherMessages.map(msg => (
              <div
                key={msg.source_id}
                className="rounded-xl border border-violet-500/20 p-4"
                style={{ background: 'rgba(139,92,246,0.05)' }}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {msg.intent_id && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-violet-500/15 text-violet-300 border border-violet-500/20">
                      {msg.intent_id}
                    </span>
                  )}
                  {msg.author_id && (
                    <span className="text-[10px] font-mono text-slate-500">
                      by {msg.author_id}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-600 ml-auto">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
        </GlassCard>
      </div>
    </div>
  );
}
