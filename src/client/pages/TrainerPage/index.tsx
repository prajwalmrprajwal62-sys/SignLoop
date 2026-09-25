import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet } from '../../api/client';
import {
  Users, AlertTriangle, CheckCircle, ChevronRight,
  FileText, BookOpen, Zap, TrendingUp, TrendingDown, Activity,
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

interface StudentSummary {
  profile: StudentProfile;
  stats: {
    total_sessions: number;
    total_candidates: number;
    approved_outputs_count: number;
    teacher_notes_count: number;
    avg_model_score: number | null;
    last_active: string | null;
  };
  sessions_by_context: Array<{ context: string; count: number }>;
  routing_breakdown: Array<{ policy_route: string; count: number }>;
  top_gestures: Array<{ final_intent: string; count: number }>;
  struggling_gestures: Array<{ intent_label: string; count: number }>;
  recent_outputs: Array<{ final_intent: string; caption_text: string; created_at: string }>;
}

const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

type TeacherTab = 'students' | 'followups';

export function TrainerPage() {
  const { } = useProfileStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TeacherTab>('students');

  // Update tab if route changes while component is mounted
  useEffect(() => {
    if (location.pathname === '/trainer') setTab('students');
  }, [location.pathname]);

  // Student data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentTasks, setStudentTasks] = useState<PracticeTask[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpCase[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);

  // Load all STUDENT profiles
  useEffect(() => {
    setLoadingStudents(true);
    apiGet<{ ok: boolean; profiles: StudentProfile[] }>('/api/profiles')
      .then(res => {
        const studs = (res.profiles ?? []).filter(p => p.role === 'STUDENT');
        setStudents(studs);
        if (studs.length > 0) {
          setSelectedStudent(studs[0] ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, []);

  // Load selected student's tasks, follow-ups, and performance summary
  useEffect(() => {
    if (!selectedStudent) return;
    setStudentSummary(null);
    apiGet<{ ok: boolean; tasks: PracticeTask[] }>(
      `/api/practice/tasks?profile_id=${selectedStudent.id}`
    ).then(res => setStudentTasks(res.tasks ?? [])).catch(console.error);

    apiGet<{ ok: boolean; followUps: FollowUpCase[] }>(
      `/api/practice/followups?profile_id=${selectedStudent.id}`
    ).then(res => setFollowUps(res.followUps ?? [])).catch(console.error);

    apiGet<{ ok: boolean; summary: StudentSummary }>(
      `/api/profiles/${selectedStudent.id}/summary`
    ).then(res => setStudentSummary(res.summary ?? null)).catch(console.error);
  }, [selectedStudent]);

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

      {/* Tabs — only Student Overview and Follow-ups. Note editor lives at /knowledge (ADD NOTE nav) */}
      <div className="flex gap-0 border-b border-white/8">
        {([
          { key: 'students' as TeacherTab, label: 'Student Overview', icon: <Users size={13} /> },
          { key: 'followups' as TeacherTab, label: 'Follow-ups to Review', icon: <AlertTriangle size={13} /> },
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

            {/* Selected student detail — full performance summary */}
            <div className="col-span-8 space-y-4">
              {selectedStudent ? (
                <>
                  {/* Header card */}
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-violet-400/15 border border-violet-400/30 flex items-center justify-center">
                          <span className="text-violet-400 font-bold text-base font-mono">
                            {selectedStudent.pseudonymous_code.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-white font-mono text-lg">{selectedStudent.pseudonymous_code}</p>
                          <p className="text-slate-500 text-xs">{selectedStudent.preferred_locale} · STUDENT</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/knowledge', { state: { studentId: selectedStudent.id } })}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <FileText size={12} /> Add Note
                      </button>
                    </div>

                    {/* Stats row */}
                    {studentSummary ? (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Sessions', value: studentSummary.stats.total_sessions, icon: <Activity size={12} className="text-cyan-400" /> },
                          { label: 'Gestures sent', value: studentSummary.stats.total_candidates, icon: <Zap size={12} className="text-amber-400" /> },
                          { label: 'Approved', value: studentSummary.stats.approved_outputs_count, icon: <CheckCircle size={12} className="text-emerald-400" /> },
                          { label: 'Avg model score', value: studentSummary.stats.avg_model_score != null ? `${studentSummary.stats.avg_model_score}%` : '—', icon: <TrendingUp size={12} className="text-violet-400" /> },
                          { label: 'Teacher notes', value: studentSummary.stats.teacher_notes_count, icon: <FileText size={12} className="text-violet-400" /> },
                          { label: 'Last active', value: studentSummary.stats.last_active ? new Date(studentSummary.stats.last_active).toLocaleDateString() : 'Never', icon: <Activity size={12} className="text-slate-400" /> },
                        ].map(s => (
                          <div key={s.label} className="rounded-xl border border-white/6 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-1 mb-1">{s.icon}<span className="text-[10px] text-slate-500 font-mono uppercase">{s.label}</span></div>
                            <span className="text-white font-bold text-base">{String(s.value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 text-xs font-mono animate-pulse mb-4">Loading summary…</p>
                    )}

                    {/* Gestures doing well vs struggling */}
                    {studentSummary && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <TrendingUp size={12} className="text-emerald-400" />
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Top gestures</span>
                          </div>
                          {studentSummary.top_gestures.length === 0 ? (
                            <p className="text-slate-600 text-xs font-mono">No data yet</p>
                          ) : (
                            <div className="space-y-1">
                              {studentSummary.top_gestures.map(g => (
                                <div key={g.final_intent} className="flex items-center gap-2 text-xs">
                                  <span className="text-base">{GESTURE_EMOJI[g.final_intent] ?? '👋'}</span>
                                  <span className="text-white font-mono flex-1">{g.final_intent}</span>
                                  <span className="text-emerald-400 font-mono">{g.count}×</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <TrendingDown size={12} className="text-amber-400" />
                            <span className="text-[10px] text-slate-400 font-mono uppercase">Needs review</span>
                          </div>
                          {studentSummary.struggling_gestures.length === 0 ? (
                            <p className="text-slate-600 text-xs font-mono">No issues found</p>
                          ) : (
                            <div className="space-y-1">
                              {studentSummary.struggling_gestures.map(g => (
                                <div key={g.intent_label} className="flex items-center gap-2 text-xs">
                                  <span className="text-base">{GESTURE_EMOJI[g.intent_label] ?? '👋'}</span>
                                  <span className="text-white font-mono flex-1">{g.intent_label}</span>
                                  <span className="text-amber-400 font-mono">{g.count} reviews</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Practice tasks */}
                    <SectionHeader className="mb-3">Assigned Practice Tasks</SectionHeader>
                    {studentTasks.length === 0 ? (
                      <p className="text-slate-600 text-xs font-mono">No tasks assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
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

                  {/* Recent approved outputs */}
                  {studentSummary && studentSummary.recent_outputs.length > 0 && (
                    <GlassCard className="p-5">
                      <SectionHeader className="mb-3">Recent Approved Communications</SectionHeader>
                      <div className="space-y-2">
                        {studentSummary.recent_outputs.slice(0, 5).map((o, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <span className="text-xl">{GESTURE_EMOJI[o.final_intent] ?? '👋'}</span>
                            <div className="flex-1">
                              <span className="font-bold text-white uppercase text-xs">{o.final_intent}</span>
                              <p className="text-slate-400 text-xs italic">"{o.caption_text}"</p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-600">{new Date(o.created_at).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
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

    </div>
  );
}
