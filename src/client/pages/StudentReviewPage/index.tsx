import { useEffect, useState, useRef } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle, BarChart2, Clock, BookOpen, Zap,
  MessageCircle, Send, ChevronDown, ChevronUp,
} from 'lucide-react';

// Gesture visuals — same as PracticePage
const GESTURE_META: Record<string, { emoji: string; caption: string; color: string }> = {
  HELP:      { emoji: '🆘', caption: 'I need help.',         color: '#ef4444' },
  WATER:     { emoji: '💧', caption: 'I need water.',        color: '#3b82f6' },
  FOOD:      { emoji: '🍽️', caption: 'I need food.',         color: '#f59e0b' },
  PAIN:      { emoji: '😣', caption: 'I am in pain.',        color: '#ef4444' },
  DOCTOR:    { emoji: '🏥', caption: 'I need a doctor.',     color: '#06b6d4' },
  MEDICINE:  { emoji: '💊', caption: 'I need medicine.',     color: '#8b5cf6' },
  WASHROOM:  { emoji: '🚻', caption: 'I need the washroom.', color: '#6366f1' },
  YES:       { emoji: '✅', caption: 'Yes.',                 color: '#10b981' },
  NO:        { emoji: '❌', caption: 'No.',                  color: '#ef4444' },
  REPEAT:    { emoji: '🔁', caption: 'Please repeat.',       color: '#f59e0b' },
  THANK_YOU: { emoji: '🙏', caption: 'Thank you.',           color: '#10b981' },
};

interface StrugglingGesture {
  intent: string; total_attempts: number; review_required: number;
  failure_rate: number; avg_score: number | null; last_attempted: string | null;
}
interface StrongGesture {
  intent: string; total_attempts: number; confirmed: number; corrected: number;
  success_rate: number; avg_score: number | null;
}
interface RecentMistake {
  candidate_id: string; intent_label: string; score: number | null;
  why_reason_code: string; created_at: string;
  decision_action: string | null; teacher_note: string | null;
}
interface TeacherNote {
  source_id: string; intent_id: string | null; content: string; created_at: string;
}
interface MostUsed { final_intent: string; count: number; }
interface AllGesture {
  intent: string; total_attempts: number; passed_gate: number;
  review_required: number; confirmed: number; corrected: number;
  avg_score: number | null;
}

interface ReviewData {
  overview: {
    total_attempts: number; all_time_pass_rate: number | null;
    recent_pass_rate: number | null; trend: string; recent_attempts: number;
  };
  struggling: StrugglingGesture[];
  strong: StrongGesture[];
  recent_mistakes: RecentMistake[];
  most_used: MostUsed[];
  teacher_notes: TeacherNote[];
  all_gestures: AllGesture[];
}

const TREND_CONFIG = {
  IMPROVING: { icon: <TrendingUp size={16} />, label: 'Improving', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  DECLINING:  { icon: <TrendingDown size={16} />, label: 'Needs attention', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  STABLE:     { icon: <Minus size={16} />, label: 'Stable', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  INSUFFICIENT_DATA: { icon: <BarChart2 size={16} />, label: 'Not enough data yet', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
};

function ScoreBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono w-8 text-right" style={{ color }}>{rate}%</span>
    </div>
  );
}

interface StudentQuestion {
  question_id: string;
  profile_id: string;
  question_text: string;
  intent_id: string | null;
  status: 'PENDING' | 'ANSWERED' | 'DISMISSED';
  teacher_answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
}

export function StudentReviewPage() {
  const { activeProfileId } = useProfileStore();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Q&A state
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [qText, setQText] = useState('');
  const [qSending, setQSending] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [qaOpen, setQaOpen] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    apiGet<{ ok: boolean; review: ReviewData }>(`/api/profiles/${activeProfileId}/review`)
      .then(res => setData(res.review))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Fetch questions for this student
  const fetchQuestions = () => {
    if (!activeProfileId) return;
    apiGet<{ ok: boolean; questions: StudentQuestion[] }>(`/api/questions?profile_id=${activeProfileId}`)
      .then(res => setQuestions(res.questions ?? []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchQuestions();
  }, [activeProfileId]);

  const handleAskTeacher = async () => {
    if (!qText.trim() || !activeProfileId) return;
    setQSending(true);
    setQError(null);
    try {
      await apiPost('/api/questions', {
        profile_id: activeProfileId,
        question_text: qText.trim(),
      });
      setQText('');
      fetchQuestions();
    } catch (err) {
      setQError(String(err));
    } finally {
      setQSending(false);
    }
  };

  if (!activeProfileId) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500 font-mono text-sm">No profile selected.</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500 font-mono text-sm animate-pulse">Loading your review…</p>
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-600/30 p-4 text-red-400 text-sm font-mono" style={{ background: 'rgba(220,38,38,0.08)' }}>
      {error}
    </div>
  );

  if (!data) return null;

  const { overview, struggling, strong, recent_mistakes, most_used, teacher_notes, all_gestures } = data;
  const trend = TREND_CONFIG[overview.trend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.INSUFFICIENT_DATA;

  const noData = overview.total_attempts === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Review</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Intelligent summary of your gesture history — what you're doing well, what needs work, and how to improve.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border"
          style={{ color: trend.color, background: trend.bg, borderColor: trend.border }}
        >
          {trend.icon}
          {trend.label}
          {overview.recent_attempts > 0 && (
            <span className="text-[10px] font-mono opacity-70 ml-1">
              (last {overview.recent_attempts} attempts)
            </span>
          )}
        </div>
      </div>

      {noData ? (
        <GlassCard className="p-12 flex flex-col items-center text-center gap-4">
          <BarChart2 size={48} className="text-slate-700" />
          <div>
            <p className="text-slate-300 font-semibold text-lg">No gesture history yet</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Start a live session and sign some gestures. Your review will build up automatically as you practice — showing your strengths, struggles, and growth over time.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total attempts', value: overview.total_attempts, icon: <Zap size={14} className="text-amber-400" />, sub: 'all time' },
              { label: 'Pass rate (all time)', value: overview.all_time_pass_rate != null ? `${overview.all_time_pass_rate}%` : '—', icon: <BarChart2 size={14} className="text-violet-400" />, sub: 'above 75% gate' },
              { label: 'Pass rate (7 days)', value: overview.recent_pass_rate != null ? `${overview.recent_pass_rate}%` : '—', icon: <TrendingUp size={14} className="text-cyan-400" />, sub: 'recent trend' },
              { label: 'Teacher notes for you', value: teacher_notes.length, icon: <BookOpen size={14} className="text-emerald-400" />, sub: 'personalized' },
            ].map(s => (
              <GlassCard key={s.label} className="p-4 space-y-2">
                <div className="flex items-center gap-1.5">{s.icon}<span className="text-[10px] font-mono text-slate-500 uppercase">{s.label}</span></div>
                <p className="text-2xl font-extrabold text-white">{String(s.value)}</p>
                <p className="text-[10px] text-slate-600 font-mono">{s.sub}</p>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-5">
            {/* LEFT column */}
            <div className="col-span-8 space-y-5">

              {/* Needs improvement */}
              {struggling.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <SectionHeader>Needs Improvement</SectionHeader>
                      <span className="text-[10px] font-mono text-slate-600 ml-auto">Gestures with highest review rate</span>
                    </div>
                    <div className="space-y-4">
                      {struggling.map(g => {
                        const meta = GESTURE_META[g.intent];
                        return (
                          <div key={g.intent} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{meta?.emoji ?? '👋'}</span>
                              <span className="font-bold text-white text-sm uppercase flex-1">{g.intent}</span>
                              <span className="text-xs font-mono text-amber-400">{g.failure_rate}% flagged</span>
                              <span className="text-xs font-mono text-slate-600">{g.total_attempts} tries</span>
                            </div>
                            <ScoreBar rate={g.failure_rate} color="#f59e0b" />
                            {g.avg_score != null && (
                              <p className="text-[10px] text-slate-600 font-mono">Avg model score: {g.avg_score}%</p>
                            )}
                            {g.last_attempted && (
                              <p className="text-[10px] text-slate-700 font-mono">Last attempted: {new Date(g.last_attempted).toLocaleDateString()}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Doing well */}
              {strong.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <SectionHeader>You're Doing Well</SectionHeader>
                      <span className="text-[10px] font-mono text-slate-600 ml-auto">Consistently passing the 75% gate</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {strong.map(g => {
                        const meta = GESTURE_META[g.intent];
                        return (
                          <div
                            key={g.intent}
                            className="rounded-xl border p-3"
                            style={{ background: `${meta?.color ?? '#10b981'}0a`, borderColor: `${meta?.color ?? '#10b981'}30` }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xl">{meta?.emoji ?? '👋'}</span>
                              <span className="font-bold text-white text-xs uppercase flex-1">{g.intent}</span>
                              <span className="text-xs font-mono text-emerald-400">{g.success_rate}%</span>
                            </div>
                            <ScoreBar rate={g.success_rate} color="#10b981" />
                            <p className="text-[10px] text-slate-600 font-mono mt-1">{g.total_attempts} attempts · {g.confirmed + g.corrected} approved</p>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Recent mistakes timeline */}
              {recent_mistakes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={14} className="text-slate-400" />
                      <SectionHeader>Recent Mistakes</SectionHeader>
                      <span className="text-[10px] font-mono text-slate-600 ml-auto">Gestures that fell below the 75% gate</span>
                    </div>
                    <div className="space-y-2">
                      {recent_mistakes.slice(0, 8).map(m => {
                        const meta = GESTURE_META[m.intent_label];
                        const score = m.score != null ? Math.round(m.score * 100) : null;
                        const isPending = !m.decision_action;
                        const isTeacherReviewed = m.decision_action === 'CONFIRM' || m.decision_action === 'CORRECT';
                        return (
                          <div
                            key={m.candidate_id}
                            className="flex items-start gap-3 p-3 rounded-xl border border-white/6"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                          >
                            <span className="text-xl shrink-0 mt-0.5">{meta?.emoji ?? '👋'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-xs uppercase">{m.intent_label}</span>
                                {score != null && (
                                  <span className="text-[10px] font-mono text-amber-400 border border-amber-400/20 bg-amber-400/8 px-1.5 rounded">
                                    {score}% score
                                  </span>
                                )}
                                {isPending && (
                                  <span className="text-[10px] font-mono text-slate-500 border border-white/10 bg-white/5 px-1.5 rounded">Pending review</span>
                                )}
                                {isTeacherReviewed && (
                                  <span className="text-[10px] font-mono text-emerald-400 border border-emerald-400/20 bg-emerald-400/8 px-1.5 rounded">Teacher reviewed</span>
                                )}
                              </div>
                              {m.teacher_note && (
                                <p className="text-xs text-violet-300 italic mt-1">👩‍🏫 "{m.teacher_note}"</p>
                              )}
                              <p className="text-[10px] text-slate-700 font-mono mt-0.5">{new Date(m.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* RIGHT column */}
            <div className="col-span-4 space-y-4">
              {/* Most used gestures */}
              {most_used.length > 0 && (
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={12} className="text-amber-400" />
                    <SectionHeader>Most Used</SectionHeader>
                  </div>
                  <div className="space-y-2.5">
                    {most_used.map((g, i) => {
                      const meta = GESTURE_META[g.final_intent];
                      const maxCount = most_used[0]?.count ?? 1;
                      return (
                        <div key={g.final_intent} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-600 w-3">{i + 1}</span>
                            <span className="text-base">{meta?.emoji ?? '👋'}</span>
                            <span className="text-xs font-bold text-white uppercase flex-1">{g.final_intent}</span>
                            <span className="text-[10px] font-mono text-slate-500">{g.count}×</span>
                          </div>
                          <div className="ml-5">
                            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${(g.count / maxCount) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* All-gestures mini scorecard */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={12} className="text-violet-400" />
                  <SectionHeader>All Gestures</SectionHeader>
                </div>
                <div className="space-y-2">
                  {all_gestures.length === 0 ? (
                    <p className="text-slate-600 text-xs font-mono">No data yet</p>
                  ) : (
                    all_gestures
                      .sort((a, b) => b.total_attempts - a.total_attempts)
                      .map(g => {
                        const meta = GESTURE_META[g.intent];
                        const passRate = g.total_attempts > 0 ? Math.round((g.passed_gate / g.total_attempts) * 100) : 0;
                        const color = passRate >= 75 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={g.intent} className="flex items-center gap-2">
                            <span className="text-sm">{meta?.emoji ?? '👋'}</span>
                            <span className="text-[10px] font-bold text-white uppercase w-16 truncate">{g.intent}</span>
                            <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${passRate}%`, background: color }} />
                            </div>
                            <span className="text-[9px] font-mono w-7 text-right" style={{ color }}>{passRate}%</span>
                          </div>
                        );
                      })
                  )}
                </div>
              </GlassCard>

              {/* Teacher notes for you */}
              {teacher_notes.length > 0 && (
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={12} className="text-violet-400" />
                    <SectionHeader>Teacher Notes</SectionHeader>
                  </div>
                  <div className="space-y-2">
                    {teacher_notes.map(n => (
                      <div
                        key={n.source_id}
                        className="rounded-lg border border-violet-500/15 p-2.5"
                        style={{ background: 'rgba(139,92,246,0.05)' }}
                      >
                        {n.intent_id && (
                          <span className="text-[9px] font-mono text-violet-400 uppercase font-semibold">
                            {GESTURE_META[n.intent_id]?.emoji} {n.intent_id}
                          </span>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{n.content}</p>
                        <p className="text-[9px] text-slate-700 font-mono mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* ─── ASK TEACHER Q&A ─────────────────────────────── */}
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MessageCircle size={15} className="text-cyan-400" />
                    <SectionHeader>Ask Your Teacher</SectionHeader>
                    {questions.filter(q => q.status === 'PENDING').length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {questions.filter(q => q.status === 'PENDING').length} awaiting reply
                      </span>
                    )}
                    {questions.filter(q => q.status === 'ANSWERED').length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        {questions.filter(q => q.status === 'ANSWERED').length} answered
                      </span>
                    )}
                  </div>
                  <button onClick={() => setQaOpen(o => !o)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    {qaOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                <AnimatePresence>
                  {qaOpen && (
                    <motion.div
                      key="qa-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Ask question input */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500 font-mono">
                          Direct message to your teacher — separate from the AI tutor. Teacher will reply below.
                        </p>
                        <div className="flex gap-2 items-end">
                          <textarea
                            ref={inputRef}
                            className="flex-1 rounded-xl p-3 text-white text-sm font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600 focus:border-cyan-500/40 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', minHeight: '68px' }}
                            placeholder='e.g. "How do I do the WATER sign correctly?" or "Why does my HELP keep failing?"'
                            value={qText}
                            onChange={e => setQText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleAskTeacher();
                              }
                            }}
                          />
                          <button
                            onClick={() => void handleAskTeacher()}
                            disabled={!qText.trim() || qSending}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all shrink-0 mb-0.5"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                        {qError && <p className="text-red-400 text-[11px] font-mono">{qError}</p>}
                        {qSending && <p className="text-cyan-400 text-[11px] font-mono animate-pulse">Sending…</p>}
                      </div>

                      {/* Q&A thread */}
                      {questions.length > 0 && (
                        <div className="space-y-4 border-t border-white/6 pt-3 max-h-96 overflow-y-auto">
                          {questions.map(q => (
                            <div key={q.question_id} className="space-y-2">
                              {/* Student question → right aligned */}
                              <div className="flex justify-end">
                                <div
                                  className="max-w-[88%] rounded-2xl rounded-tr-sm px-4 py-2.5"
                                  style={{ background: 'rgba(45,226,230,0.08)', border: '1px solid rgba(45,226,230,0.18)' }}
                                >
                                  <p className="text-sm text-white leading-relaxed">{q.question_text}</p>
                                  <div className="flex items-center justify-between gap-3 mt-1">
                                    <span className="text-[9px] text-slate-600 font-mono">
                                      {new Date(q.created_at).toLocaleString()}
                                    </span>
                                    <span className={`text-[9px] font-mono font-bold uppercase ${
                                      q.status === 'ANSWERED' ? 'text-emerald-400'
                                      : q.status === 'DISMISSED' ? 'text-slate-500'
                                      : 'text-amber-400'
                                    }`}>
                                      {q.status === 'ANSWERED' ? '✓ Answered'
                                       : q.status === 'DISMISSED' ? '— Dismissed'
                                       : '⏳ Awaiting reply'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Teacher answer → left aligned */}
                              {q.teacher_answer && (
                                <div className="flex justify-start">
                                  <div
                                    className="max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-2.5"
                                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.22)' }}
                                  >
                                    <p className="text-[10px] text-violet-400 font-mono font-bold mb-1 uppercase tracking-wider">Teacher</p>
                                    <p className="text-sm text-white leading-relaxed">{q.teacher_answer}</p>
                                    {q.answered_at && (
                                      <p className="text-[9px] text-slate-600 font-mono mt-1">
                                        {new Date(q.answered_at).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {questions.length === 0 && (
                        <p className="text-slate-600 text-xs font-mono text-center py-2">
                          No questions yet — type above to ask your teacher something
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
