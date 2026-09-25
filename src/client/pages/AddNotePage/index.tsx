import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost, apiPatch } from '../../api/client';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { CheckCircle, BookOpen, Save, Lightbulb, MessageSquare, FileText, Send, ChevronDown } from 'lucide-react';

interface StudentProfile {
  id: string;
  pseudonymous_code: string;
  role: string;
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
  student_code?: string; // joined from profile
}

const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

const ALL_INTENTS = [
  'HELP', 'WATER', 'FOOD', 'PAIN', 'DOCTOR', 'MEDICINE',
  'WASHROOM', 'YES', 'NO', 'REPEAT', 'THANK_YOU',
];

type AddNoteTab = 'note' | 'questions';

export function AddNotePage() {
  const { activeProfileId } = useProfileStore();
  const location = useLocation();
  const locationState = location.state as { studentId?: string } | null;

  const [tab, setTab] = useState<AddNoteTab>('note');

  // Student list
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // Note editor state
  const [noteIntent, setNoteIntent] = useState('HELP');
  const [noteTargetStudent, setNoteTargetStudent] = useState(locationState?.studentId ?? '');
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Student questions state
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [answerSaving, setAnswerSaving] = useState<Record<string, boolean>>({});
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [filterStudent, setFilterStudent] = useState('');

  // Load students
  useEffect(() => {
    apiGet<{ ok: boolean; profiles: StudentProfile[] }>('/api/profiles')
      .then(res => setStudents((res.profiles ?? []).filter(p => p.role === 'STUDENT')))
      .catch(console.error);
  }, []);

  // Pre-select student from navigation state
  useEffect(() => {
    if (locationState?.studentId) {
      setNoteTargetStudent(locationState.studentId);
    }
  }, [locationState?.studentId]);

  // Load questions
  const fetchQuestions = () => {
    setQLoading(true);
    apiGet<{ ok: boolean; questions: StudentQuestion[] }>('/api/questions/pending')
      .then(res => setQuestions(res.questions ?? []))
      .catch(console.error)
      .finally(() => setQLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
    // Re-poll every 30s so teacher sees new questions without refresh
    const interval = setInterval(fetchQuestions, 30000);
    return () => clearInterval(interval);
  }, []);

  // When switching to questions tab, also reload
  useEffect(() => {
    if (tab === 'questions') fetchQuestions();
  }, [tab]);

  // Save a note
  const handleSave = async () => {
    if (!noteText.trim() || !activeProfileId) return;
    setNoteSaving(true);
    setNoteSaved(false);
    setNoteError(null);
    try {
      const res = await apiPost<{ ok: boolean; source: { source_id: string } }>('/api/knowledge/sources', {
        source_class: 'TEACHER_KNOWLEDGE',
        profile_id: noteTargetStudent || null,
        intent_id: noteIntent,
        author_id: activeProfileId,
        author_role: 'TEACHER',
        content: noteText.trim(),
        content_type: 'INSTRUCTION',
        locale: 'en-IN',
        consent_scope: 'LEARNING_PRACTICE',
        retention_class: 'PERMANENT_AUDIT',
        supersedes_id: null,
        session_id: null,
        event_id: null,
        task_id: null,
        context: 'LEARNING_PRACTICE',
        source_title: `Teacher note: ${noteIntent}${noteTargetStudent
          ? ` (${students.find(s => s.id === noteTargetStudent)?.pseudonymous_code ?? 'student'})`
          : ' (global)'}`,
      });
      await apiPost(`/api/knowledge/sources/${res.source.source_id}/approve`, {
        author_id: activeProfileId,
      });
      setNoteText('');
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 4000);
    } catch (err) {
      setNoteError(String(err));
    } finally {
      setNoteSaving(false);
    }
  };

  // Answer a student question
  const handleAnswer = async (questionId: string) => {
    const text = answerText[questionId]?.trim();
    if (!text || !activeProfileId) return;
    setAnswerSaving(prev => ({ ...prev, [questionId]: true }));
    try {
      await apiPatch(`/api/questions/${questionId}/answer`, {
        teacher_answer: text,
        answered_by: activeProfileId,
      });
      setAnswerText(prev => ({ ...prev, [questionId]: '' }));
      setExpandedQuestion(null);
      fetchQuestions();
    } catch (err) {
      console.error(err);
    } finally {
      setAnswerSaving(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Dismiss a question
  const handleDismiss = async (questionId: string) => {
    if (!activeProfileId) return;
    try {
      await apiPatch(`/api/questions/${questionId}/dismiss`, { answered_by: activeProfileId });
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingCount = questions.length;
  const selectedStudentName = students.find(s => s.id === noteTargetStudent)?.pseudonymous_code;
  const filteredQuestions = filterStudent
    ? questions.filter(q => q.profile_id === filterStudent)
    : questions;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Teacher Knowledge</h1>
          <p className="text-slate-500 text-sm mt-0.5">Add notes to the student tutor or answer student questions.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/30 bg-violet-400/8 text-violet-300 text-xs font-mono font-semibold">
          <BookOpen size={12} />
          Notes here → Student RAG tutor
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-white/10">
        <button
          onClick={() => setTab('note')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'note' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          <FileText size={14} />
          Write Note
        </button>
        <button
          onClick={() => setTab('questions')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all relative ${
            tab === 'questions' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          <MessageSquare size={14} />
          Student Questions
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-3 min-w-[18px] h-[18px] text-[10px] font-bold bg-amber-500 text-zinc-950 rounded-full flex items-center justify-center px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── WRITE NOTE TAB ─────────────────────────────────────────── */}
        {tab === 'note' && (
          <motion.div key="note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
            {/* How it works */}
            <div className="rounded-2xl border border-violet-500/20 p-4" style={{ background: 'rgba(139,92,246,0.06)' }}>
              <div className="flex items-start gap-3">
                <Lightbulb size={16} className="text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-violet-200 text-sm font-semibold mb-1">How notes reach the student tutor</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Notes are stored as <strong className="text-white">TEACHER_KNOWLEDGE</strong> and approved instantly.
                    When a student asks their tutor a question — your exact note is retrieved and cited.{' '}
                    <strong className="text-white">No hallucination.</strong> Only your words.
                  </p>
                </div>
              </div>
            </div>

            <GlassCard className="p-6 space-y-5">
              <SectionHeader>Write a Teacher Note</SectionHeader>

              {/* Step 1 — Gesture */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  1. Gesture this note is about
                </label>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                  {ALL_INTENTS.map(intent => (
                    <button
                      key={intent}
                      onClick={() => setNoteIntent(intent)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center ${
                        noteIntent === intent
                          ? 'border-violet-400/50 bg-violet-400/10 text-white'
                          : 'border-white/8 text-slate-400 hover:border-white/20'
                      }`}
                      style={{ background: noteIntent === intent ? undefined : 'rgba(255,255,255,0.03)' }}
                    >
                      <span className="text-xl">{GESTURE_EMOJI[intent] ?? '👋'}</span>
                      <span className="text-[9px] font-mono font-semibold leading-tight">{intent.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 — Student */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  2. For which student? <span className="text-slate-600">(optional — blank = all)</span>
                </label>
                <select
                  value={noteTargetStudent}
                  onChange={e => setNoteTargetStudent(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-white font-mono text-sm border border-white/10 focus:outline-none focus:border-violet-500/40"
                  style={{ background: '#1e293b' }}
                >
                  <option value="">All students (global note)</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.pseudonymous_code}</option>
                  ))}
                </select>
                {selectedStudentName && (
                  <p className="text-[11px] text-violet-400 font-mono mt-1">
                    ✓ Only visible in {selectedStudentName}'s tutor
                  </p>
                )}
              </div>

              {/* Step 3 — Content */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  3. Your instruction or observation
                </label>
                <textarea
                  className="w-full rounded-xl p-4 text-white text-sm h-36 font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600 focus:border-violet-500/40 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  placeholder={`e.g. "Student confuses ${noteIntent} and REPEAT — practice them separately…"`}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <p className="text-slate-600 text-[10px] mt-1 font-mono">
                  {noteText.trim().length} chars · Retrieved word-for-word by student tutor
                </p>
              </div>

              {noteError && <p className="text-red-400 text-xs font-mono">{noteError}</p>}

              <div className="flex items-center gap-4">
                <button
                  onClick={() => void handleSave()}
                  disabled={!noteText.trim() || noteSaving}
                  className="flex items-center gap-2 px-6 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm disabled:opacity-40 transition-all"
                >
                  <Save size={14} />
                  {noteSaving ? 'Saving…' : 'Save Note → Student Tutor'}
                </button>
                {noteSaved && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-sm font-mono"
                  >
                    <CheckCircle size={14} />
                    Saved! Available immediately.
                  </motion.div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ─── STUDENT QUESTIONS TAB ─────────────────────────────────── */}
        {tab === 'questions' && (
          <motion.div key="questions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25">
                  <span className="text-amber-400 font-bold text-sm">{pendingCount}</span>
                  <span className="text-amber-400/70 text-xs font-mono">unanswered</span>
                </div>
                {qLoading && <span className="text-slate-600 text-xs font-mono animate-pulse">Refreshing…</span>}
              </div>
              {/* Filter by student */}
              <select
                value={filterStudent}
                onChange={e => setFilterStudent(e.target.value)}
                className="rounded-lg px-2 py-1.5 text-white font-mono text-xs border border-white/10 focus:outline-none"
                style={{ background: '#1e293b' }}
              >
                <option value="">All students</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.pseudonymous_code}</option>
                ))}
              </select>
            </div>

            {filteredQuestions.length === 0 && !qLoading && (
              <GlassCard className="p-8 text-center">
                <MessageSquare size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-mono">
                  {pendingCount === 0 ? 'No pending questions — all caught up! 🎉' : 'No questions from this student yet.'}
                </p>
              </GlassCard>
            )}

            <div className="space-y-3">
              {filteredQuestions.map(q => {
                const studentName = students.find(s => s.id === q.profile_id)?.pseudonymous_code ?? q.student_code ?? q.profile_id;
                const isExpanded = expandedQuestion === q.question_id;

                return (
                  <GlassCard key={q.question_id} className="p-4 space-y-3">
                    {/* Question header */}
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-violet-400 uppercase">{studentName}</span>
                          <span className="text-[10px] text-slate-600 font-mono">{new Date(q.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-white leading-relaxed">{q.question_text}</p>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-slate-500 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>

                    {/* Answer form — visible when expanded */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-white/6 pt-3 space-y-2"
                        >
                          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Your answer</label>
                          <textarea
                            className="w-full rounded-xl p-3 text-white text-sm font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600 focus:border-violet-500/40 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', minHeight: '70px' }}
                            placeholder={`Reply to ${studentName}…`}
                            value={answerText[q.question_id] ?? ''}
                            onChange={e => setAnswerText(prev => ({ ...prev, [q.question_id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void handleAnswer(q.question_id)}
                              disabled={!(answerText[q.question_id]?.trim()) || answerSaving[q.question_id]}
                              className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-40 transition-all"
                            >
                              <Send size={12} />
                              {answerSaving[q.question_id] ? 'Sending…' : 'Send Answer'}
                            </button>
                            <button
                              onClick={() => void handleDismiss(q.question_id)}
                              className="px-4 h-9 rounded-xl border border-white/10 text-slate-500 hover:text-slate-300 text-xs font-mono transition-all"
                            >
                              Dismiss
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom info — only show on note tab */}
      {tab === 'note' && (
        <div className="flex items-center gap-2 text-slate-600 text-xs font-mono">
          <BookOpen size={11} />
          <span>TEACHER_KNOWLEDGE · Auto-approved · Cited with source attribution</span>
        </div>
      )}
    </div>
  );
}
