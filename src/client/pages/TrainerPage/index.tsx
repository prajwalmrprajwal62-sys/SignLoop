import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import {
  Users, AlertTriangle, CheckCircle, ChevronRight,
  FileText, Save, BookOpen, Zap, Lightbulb,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentProfile {
  id: string;
  pseudonymous_code: string;
  role: string;
  preferred_locale: string;
}

interface PracticeTask {
  task_id: string;
  profile_id: string;
  intent_id: string;
  instruction: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  target_repetitions: number;
  completed_repetitions: number;
}

interface FollowUpCase {
  case_id: string;
  profile_id: string;
  intent_id: string;
  correction_reason: string;
  status: string;
}

const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

const ALL_INTENTS = [
  'HELP','WATER','FOOD','PAIN','DOCTOR','MEDICINE','WASHROOM','YES','NO','REPEAT','THANK_YOU',
];

type TeacherTab = 'students' | 'followups' | 'note';

export function TrainerPage() {
  const { activeProfileId, contextType } = useProfileStore();
  const location = useLocation();
  const [tab, setTab] = useState<TeacherTab>(
    location.pathname === '/knowledge' ? 'note' : 'students'
  );

  // Update tab if route changes while component is mounted
  useEffect(() => {
    if (location.pathname === '/knowledge') setTab('note');
    else if (location.pathname === '/trainer') setTab('students');
  }, [location.pathname]);

  // Student data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentTasks, setStudentTasks] = useState<PracticeTask[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpCase[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Note editor
  const [noteIntent, setNoteIntent] = useState('HELP');
  const [noteText, setNoteText] = useState('');
  const [noteTargetStudent, setNoteTargetStudent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Load all STUDENT profiles
  useEffect(() => {
    setLoadingStudents(true);
    apiGet<{ ok: boolean; profiles: StudentProfile[] }>('/api/profiles')
      .then(res => {
        const studs = (res.profiles ?? []).filter(p => p.role === 'STUDENT');
        setStudents(studs);
        if (studs.length > 0) {
          setSelectedStudent(studs[0] ?? null);
          setNoteTargetStudent(studs[0]?.id ?? '');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, []);

  // Load selected student's tasks and follow-ups
  useEffect(() => {
    if (!selectedStudent) return;
    apiGet<{ ok: boolean; tasks: PracticeTask[] }>(
      `/api/practice/tasks?profile_id=${selectedStudent.id}`
    ).then(res => setStudentTasks(res.tasks ?? [])).catch(console.error);

    apiGet<{ ok: boolean; followUps: FollowUpCase[] }>(
      `/api/practice/followups?profile_id=${selectedStudent.id}`
    ).then(res => setFollowUps(res.followUps ?? [])).catch(console.error);
  }, [selectedStudent]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !activeProfileId) return;
    setNoteSaving(true);
    setNoteSaved(false);
    try {
      await apiPost('/api/knowledge/sources', {
        source_class: 'TEACHER_KNOWLEDGE',
        profile_id: noteTargetStudent || null,
        intent_id: noteIntent,
        author_id: activeProfileId,
        author_role: 'TEACHER',
        content: noteText.trim(),
        content_type: 'text/plain',
        locale: 'en-IN',
        consent_scope: contextType ?? 'LEARNING_PRACTICE',
        retention_class: 'PERMANENT_AUDIT',
        supersedes_id: null,
        session_id: null,
        event_id: null,
        task_id: null,
        context: contextType ?? 'LEARNING_PRACTICE',
        source_title: `Teacher note: ${noteIntent}${noteTargetStudent ? ' (for student)' : ''}`,
      });
      setNoteText('');
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setNoteSaving(false);
    }
  };

  const completionRate = (task: PracticeTask) =>
    task.target_repetitions > 0
      ? Math.round((task.completed_repetitions / task.target_repetitions) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Teacher header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Teacher Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor students, review follow-ups, and add knowledge notes that feed the student tutor.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/30 bg-violet-400/8 text-violet-300 text-xs font-mono font-semibold">
          <BookOpen size={12} />
          Notes you add here → Student RAG tutor
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8">
        {([
          { key: 'students' as TeacherTab, label: 'Student Overview', icon: <Users size={13} /> },
          { key: 'followups' as TeacherTab, label: 'Follow-ups to Review', icon: <AlertTriangle size={13} /> },
          { key: 'note' as TeacherTab, label: 'Add Teacher Note', icon: <FileText size={13} /> },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              tab === t.key
                ? 'border-violet-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── STUDENT OVERVIEW TAB ─────────────────────────────────── */}
      {tab === 'students' && (
        <motion.div key="students" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-12 gap-5">
            {/* Student list */}
            <div className="col-span-4 space-y-2">
              <SectionHeader className="mb-2">Your Students</SectionHeader>
              {loadingStudents && (
                <p className="text-slate-500 text-xs font-mono animate-pulse">Loading…</p>
              )}
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedStudent?.id === s.id
                      ? 'border-violet-400/40 bg-violet-400/8'
                      : 'border-white/8 hover:border-white/15'
                  }`}
                  style={{ background: selectedStudent?.id === s.id ? undefined : 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{s.pseudonymous_code}</span>
                    <ChevronRight size={14} className="text-slate-500" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono uppercase">{s.role}</span>
                </button>
              ))}
              {students.length === 0 && !loadingStudents && (
                <p className="text-slate-600 text-xs font-mono">No student profiles found.</p>
              )}
            </div>

            {/* Selected student detail */}
            <div className="col-span-8 space-y-4">
              {selectedStudent ? (
                <>
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-400/15 border border-violet-400/30 flex items-center justify-center">
                        <span className="text-violet-400 font-bold text-sm font-mono">
                          {selectedStudent.pseudonymous_code.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-white font-mono">{selectedStudent.pseudonymous_code}</p>
                        <p className="text-slate-500 text-xs">{selectedStudent.preferred_locale} · STUDENT</p>
                      </div>
                    </div>

                    {/* Practice tasks */}
                    <SectionHeader className="mb-3">Assigned Practice Tasks</SectionHeader>
                    {studentTasks.length === 0 ? (
                      <p className="text-slate-600 text-xs font-mono">No tasks assigned yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentTasks.map(task => (
                          <div
                            key={task.task_id}
                            className="p-3 rounded-xl border border-white/6"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xl">{GESTURE_EMOJI[task.intent_id] ?? '👋'}</span>
                              <span className="font-bold text-white uppercase text-sm flex-1">{task.intent_id}</span>
                              <StatusBadge status={task.status} size="xs" />
                            </div>
                            {task.instruction && (
                              <p className="text-slate-400 text-xs italic mb-2">"{task.instruction}"</p>
                            )}
                            {/* Progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-400 transition-all"
                                  style={{ width: `${completionRate(task)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">
                                {task.completed_repetitions}/{task.target_repetitions}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>

                  {/* Quick note for this student */}
                  <GlassCard className="p-5 border border-violet-400/15">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={13} className="text-violet-400" />
                      <SectionHeader>Add a Quick Note for {selectedStudent.pseudonymous_code}</SectionHeader>
                    </div>
                    <p className="text-slate-500 text-xs mb-3">
                      Notes you write here are stored in the knowledge base and feed directly into the student's RAG tutor.
                      When they ask "Why this task?" the tutor will cite your note.
                    </p>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={noteIntent}
                        onChange={e => setNoteIntent(e.target.value)}
                        className="rounded-lg px-3 py-1.5 text-white font-mono text-xs border border-white/10 focus:outline-none"
                        style={{ background: '#1e293b' }}
                      >
                        {ALL_INTENTS.map(i => (
                          <option key={i} value={i}>{GESTURE_EMOJI[i]} {i}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      className="w-full rounded-xl p-3 text-white text-sm h-20 font-mono focus:outline-none resize-none border border-white/10"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                      placeholder={`Write an instruction for ${selectedStudent.pseudonymous_code} about ${noteIntent}…`}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          setNoteTargetStudent(selectedStudent.id);
                          void handleSaveNote();
                        }}
                        disabled={!noteText.trim() || noteSaving}
                        className="flex items-center gap-1.5 px-5 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50 transition-all"
                      >
                        <Save size={12} />
                        {noteSaving ? 'Saving…' : 'Save Note → Student Tutor'}
                      </button>
                      {noteSaved && (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                          <CheckCircle size={12} /> Saved to knowledge base
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Users size={36} className="text-slate-700 mb-3" />
                  <p className="text-slate-500 font-mono text-sm">Select a student to view their progress</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── FOLLOW-UPS TAB ───────────────────────────────────────── */}
      {tab === 'followups' && (
        <motion.div key="followups" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 p-4 mb-2" style={{ background: 'rgba(245,158,11,0.06)' }}>
            <p className="text-amber-300 text-sm font-semibold mb-1">
              <AlertTriangle size={13} className="inline mr-1" /> What are follow-ups?
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              When a student's gesture gets a model score below the 75% routing gate, it's flagged as a follow-up case.
              These need your attention — review them, understand the pattern, and add a note or assign a practice task.
            </p>
          </div>

          {/* Student selector */}
          <div className="flex gap-2 flex-wrap">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`px-4 py-2 rounded-xl border text-sm font-mono font-semibold transition-all ${
                  selectedStudent?.id === s.id
                    ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                    : 'border-white/10 text-slate-400 hover:text-white'
                }`}
                style={{ background: selectedStudent?.id === s.id ? undefined : 'rgba(255,255,255,0.04)' }}
              >
                {s.pseudonymous_code}
              </button>
            ))}
          </div>

          {selectedStudent && (
            <div>
              <SectionHeader className="mb-3">
                Follow-up cases for {selectedStudent.pseudonymous_code}
              </SectionHeader>
              {followUps.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-slate-300 font-semibold">No open follow-up cases!</p>
                  <p className="text-slate-500 text-sm mt-1">This student has no pending review cases.</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {followUps.map(f => (
                    <GlassCard key={f.case_id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{GESTURE_EMOJI[f.intent_id] ?? '👋'}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white uppercase">{f.intent_id}</span>
                            <StatusBadge status={f.status} size="xs" />
                          </div>
                          <p className="text-slate-400 text-sm italic">"{f.correction_reason}"</p>
                        </div>
                        <div className="flex gap-2">
                          <Zap size={14} className="text-amber-400 mt-0.5" />
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── ADD NOTE TAB ─────────────────────────────────────────── */}
      {tab === 'note' && (
        <motion.div key="note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="max-w-2xl space-y-5">
            <div className="rounded-2xl border border-violet-500/20 p-4" style={{ background: 'rgba(139,92,246,0.06)' }}>
              <p className="text-violet-300 text-sm font-semibold mb-1">
                <Lightbulb size={13} className="inline mr-1" /> How notes feed the RAG tutor
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Every note you write is stored in the knowledge base with <strong className="text-white">TEACHER_KNOWLEDGE</strong> source class.
                When a student asks their tutor "Why this task?" or "What should I practice?" — the tutor retrieves your exact note
                and cites it as the source. No hallucination, only your words.
              </p>
            </div>

            <GlassCard className="p-6 space-y-4">
              <SectionHeader>Write a Teacher Note</SectionHeader>

              {/* Gesture */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Gesture (Intent)
                </label>
                <div className="grid grid-cols-5 gap-2">
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
                      <span className="text-[9px] font-mono font-semibold">{intent.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target student (optional) */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  For student (optional — leave blank for all)
                </label>
                <select
                  value={noteTargetStudent}
                  onChange={e => setNoteTargetStudent(e.target.value)}
                  className="rounded-lg px-3 py-2 text-white font-mono text-sm border border-white/10 focus:outline-none w-full"
                  style={{ background: '#1e293b' }}
                >
                  <option value="">All students</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.pseudonymous_code}</option>
                  ))}
                </select>
              </div>

              {/* Note content */}
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Instruction / Observation
                </label>
                <textarea
                  className="w-full rounded-xl p-4 text-white text-sm h-32 font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  placeholder={`e.g. "Student is confusing ${noteIntent} and REPEAT. Practice them separately before combining…"`}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <p className="text-slate-600 text-[11px] mt-1 font-mono">
                  {noteText.trim().length} chars · This exact text will be retrieved and cited by the student's tutor.
                </p>
              </div>

              <button
                onClick={() => void handleSaveNote()}
                disabled={!noteText.trim() || noteSaving}
                className="flex items-center gap-2 px-6 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm disabled:opacity-50 transition-all"
              >
                <Save size={14} />
                {noteSaving ? 'Saving to knowledge base…' : 'Save Note → Student RAG Tutor'}
              </button>

              {noteSaved && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-emerald-400 text-sm font-mono"
                >
                  <CheckCircle size={14} />
                  Saved! The student's tutor can now cite this note.
                </motion.div>
              )}
            </GlassCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
