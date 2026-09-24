import { useEffect, useState } from 'react';
import { TutorPanel } from '../../components/tutor/TutorPanel';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet } from '../../api/client';
import { BookOpen, Target } from 'lucide-react';

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

export function PracticePage() {
  const { activeProfileId, role, contextType, consentGranted } = useProfileStore();
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    apiGet<{ ok: boolean; tasks: PracticeTask[] }>(`/api/practice/tasks?profile_id=${activeProfileId}`)
      .then(res => setTasks(res.tasks ?? []))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const activeTask = tasks[0] ?? null;
  const otherTasks = tasks.slice(1);

  const completedReps = activeTask?.completed_repetitions ?? 0;
  const targetReps = activeTask?.target_repetitions ?? 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 font-mono text-sm animate-pulse">Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-600/10 border border-red-600/30 p-4 text-red-400 text-sm font-mono">
        {error}
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 font-mono text-sm">No profile selected. Return to home to pick a profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Active task card */}
      {activeTask ? (
        <GlassCard className="p-8 flex flex-col items-center text-center">
          {/* Gesture name — minimum text-5xl font-extrabold per spec */}
          <h1 className="text-5xl font-extrabold text-white uppercase tracking-wide mb-6">
            {activeTask.intent_id}
          </h1>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: targetReps }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < completedReps
                    ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,226,230,0.6)]'
                    : 'border-2 border-zinc-600'
                }`}
              />
            ))}
            <span className="text-xs font-mono text-zinc-400 ml-3">
              {completedReps} / {targetReps} completed
            </span>
          </div>

          {/* Teacher instruction */}
          <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6">
            <p className="text-amber-200 italic text-sm leading-relaxed">
              {activeTask.instruction || `Practice the "${activeTask.intent_id}" gesture slowly and ensure full extension.`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col w-full max-w-md gap-3">
            <button className="bg-teal-600 hover:bg-teal-500 text-white h-14 rounded-xl font-bold tracking-wider w-full transition-all">
              PRACTICE NOW
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white h-10 rounded-lg text-sm font-semibold transition-all">
                SHOW AGAIN
              </button>
              <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white h-10 rounded-lg text-sm font-semibold transition-all">
                ASK TEACHER
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-8 flex flex-col items-center text-center">
          <Target size={40} className="text-zinc-600 mb-3" />
          <p className="text-zinc-500 font-mono text-sm">No active practice tasks assigned.</p>
          <p className="text-zinc-600 text-xs mt-1">A teacher must assign tasks to your profile.</p>
        </GlassCard>
      )}

      {/* Tutor panel — exactly 4 fixed buttons, NO text input */}
      <div>
        <SectionHeader className="mb-3 flex items-center gap-2">
          <BookOpen size={12} /> Tutor Assistant
        </SectionHeader>
        <TutorPanel
          profileId={activeProfileId ?? ''}
          contextType={contextType ?? 'LEARNING_PRACTICE'}
          role={role ?? 'STUDENT'}
          consentGranted={consentGranted}
          intentId={activeTask?.intent_id}
        />
      </div>

      {/* Other assigned tasks */}
      {otherTasks.length > 0 && (
        <div>
          <SectionHeader className="mb-3">Assigned Tasks</SectionHeader>
          <div className="space-y-2">
            {otherTasks.map(t => (
              <GlassCard
                key={t.task_id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-white uppercase text-sm">{t.intent_id}</span>
                  {t.instruction && (
                    <p className="text-zinc-500 text-xs mt-0.5 italic">{t.instruction}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">
                    {t.completed_repetitions}/{t.target_repetitions}
                  </span>
                  <StatusBadge status={t.status} size="xs" />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
