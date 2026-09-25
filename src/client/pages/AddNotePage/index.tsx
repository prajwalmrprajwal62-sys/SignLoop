import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { CheckCircle, BookOpen, Save, Lightbulb } from 'lucide-react';

interface StudentProfile {
  id: string;
  pseudonymous_code: string;
  role: string;
}

const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

const ALL_INTENTS = [
  'HELP', 'WATER', 'FOOD', 'PAIN', 'DOCTOR', 'MEDICINE',
  'WASHROOM', 'YES', 'NO', 'REPEAT', 'THANK_YOU',
];

export function AddNotePage() {
  const { activeProfileId } = useProfileStore();
  const location = useLocation();
  const locationState = location.state as { studentId?: string } | null;

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [noteIntent, setNoteIntent] = useState('HELP');
  // Pre-select student from navigation state (clicking "Add Note" on a student card)
  const [noteTargetStudent, setNoteTargetStudent] = useState(locationState?.studentId ?? '');
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ ok: boolean; profiles: StudentProfile[] }>('/api/profiles')
      .then(res => setStudents((res.profiles ?? []).filter(p => p.role === 'STUDENT')))
      .catch(console.error);
  }, []);

  // If navigation state changes (navigated from student card), update pre-selection
  useEffect(() => {
    if (locationState?.studentId) {
      setNoteTargetStudent(locationState.studentId);
    }
  }, [locationState?.studentId]);

  const handleSave = async () => {
    if (!noteText.trim() || !activeProfileId) return;
    setNoteSaving(true);
    setNoteSaved(false);
    setError(null);
    try {
      // Create the note
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
        source_title: `Teacher note: ${noteIntent}${noteTargetStudent ? ` (${students.find(s => s.id === noteTargetStudent)?.pseudonymous_code ?? 'student'})` : ' (global)'}`,
      });
      // Auto-approve immediately so student sees it right away
      await apiPost(`/api/knowledge/sources/${res.source.source_id}/approve`, {
        author_id: activeProfileId,
      });
      setNoteText('');
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 4000);
    } catch (err) {
      setError(String(err));
    } finally {
      setNoteSaving(false);
    }
  };

  const selectedStudentName = students.find(s => s.id === noteTargetStudent)?.pseudonymous_code;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Add Teacher Note</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Write knowledge that feeds directly into the student's RAG tutor — cited word-for-word.
        </p>
      </div>

      {/* How it works banner */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/20 p-4"
        style={{ background: 'rgba(139,92,246,0.06)' }}
      >
        <div className="flex items-start gap-3">
          <Lightbulb size={16} className="text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-violet-200 text-sm font-semibold mb-1">How notes reach the student tutor</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every note you write is stored as <strong className="text-white">TEACHER_KNOWLEDGE</strong> and approved instantly.
              When a student asks their tutor <em>"Why this task?"</em> or types any question — the tutor retrieves your exact note
              and cites it as the source. <strong className="text-white">No hallucination.</strong> Only your words reach the student.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Note editor */}
      <GlassCard className="p-6 space-y-5">
        <SectionHeader>Write a Teacher Note</SectionHeader>

        {/* Step 1 — Select gesture */}
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

        {/* Step 2 — Target student */}
        <div>
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
            2. For which student? <span className="text-slate-600">(optional — leave blank to apply to all)</span>
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
              ✓ This note will only appear in {selectedStudentName}'s tutor
            </p>
          )}
        </div>

        {/* Step 3 — Note content */}
        <div>
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
            3. Your instruction or observation
          </label>
          <textarea
            className="w-full rounded-xl p-4 text-white text-sm h-36 font-mono focus:outline-none resize-none border border-white/10 placeholder-slate-600 focus:border-violet-500/40 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            placeholder={`e.g. "Student confuses ${noteIntent} and REPEAT — practice them separately. Focus on the starting hand position."`}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <p className="text-slate-600 text-[10px] mt-1 font-mono">
            {noteText.trim().length} chars · This exact text will be retrieved word-for-word by the student's tutor
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs font-mono">{error}</p>
        )}

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => void handleSave()}
            disabled={!noteText.trim() || noteSaving}
            className="flex items-center gap-2 px-6 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm disabled:opacity-40 transition-all"
          >
            <Save size={14} />
            {noteSaving ? 'Saving and approving…' : 'Save Note → Student Tutor'}
          </button>

          {noteSaved && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-400 text-sm font-mono"
            >
              <CheckCircle size={14} />
              Saved! Student tutor will cite this immediately.
            </motion.div>
          )}
        </div>
      </GlassCard>

      {/* Bottom info */}
      <div className="flex items-center gap-2 text-slate-600 text-xs font-mono">
        <BookOpen size={11} />
        <span>Notes are stored as TEACHER_KNOWLEDGE · Auto-approved · Cited with source attribution · Never hallucinated</span>
      </div>
    </div>
  );
}
