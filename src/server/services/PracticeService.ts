// PracticeService.ts — Practice tasks + follow-up comparison
// DB: practice_tasks (task_id, profile_id, context, intent_id, instruction, source_teacher_note_id, priority, status, target_repetitions, completed_repetitions, created_at, due_at)
// Note: DB uses 'ABANDONED' not 'DEFERRED' (from 010_practice_tasks.sql)
import { getDb } from '../db/connection';
import type { PracticeTask, FollowUpCase, FollowUpComparison } from '../../shared/types/practice';

export class PracticeService {
  static getTasks(profileId: string): PracticeTask[] {
    return getDb().prepare(
      "SELECT * FROM practice_tasks WHERE profile_id = ? AND status NOT IN ('COMPLETED', 'ABANDONED') ORDER BY priority DESC, created_at ASC"
    ).all(profileId) as PracticeTask[];
  }

  static getTaskById(taskId: string): PracticeTask | undefined {
    return getDb().prepare('SELECT * FROM practice_tasks WHERE task_id = ?').get(taskId) as PracticeTask | undefined;
  }

  static createTask(data: Omit<PracticeTask, 'task_id' | 'created_at' | 'completed_repetitions'>): PracticeTask {
    const db = getDb();
    const now = new Date().toISOString();
    const task: PracticeTask = {
      ...data,
      task_id: crypto.randomUUID(),
      completed_repetitions: 0,
      created_at: now,
    };
    db.prepare(`
      INSERT INTO practice_tasks (task_id, profile_id, context, intent_id, instruction, source_teacher_note_id, priority, status, target_repetitions, completed_repetitions, created_at, due_at)
      VALUES (@task_id, @profile_id, @context, @intent_id, @instruction, @source_teacher_note_id, @priority, @status, @target_repetitions, @completed_repetitions, @created_at, @due_at)
    `).run(task);
    return task;
  }

  static completeTask(taskId: string, repsAdded = 1): PracticeTask {
    const db = getDb();
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    const newReps = task.completed_repetitions + repsAdded;
    const newStatus = newReps >= task.target_repetitions ? 'COMPLETED' : task.status;
    db.prepare(`
      UPDATE practice_tasks SET completed_repetitions = ?, status = ? WHERE task_id = ?
    `).run(newReps, newStatus, taskId);
    return this.getTaskById(taskId)!;
  }

  static getFollowUps(profileId: string): FollowUpCase[] {
    return getDb().prepare(
      "SELECT * FROM follow_up_cases WHERE profile_id = ? AND status NOT IN ('CLOSED') ORDER BY created_at DESC"
    ).all(profileId) as FollowUpCase[];
  }

  static compareFollowUp(params: {
    profileId: string;
    intentId: string;
    beforeCutoff: string;
    afterCutoff: string;
    minimumEligibleAttempts: number;
  }): FollowUpComparison {
    const db = getDb();
    const beforeData = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN c.policy_route = 'REVIEW_REQUIRED' THEN 1 ELSE 0 END) as review_count
      FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ? AND c.intent_label = ? AND c.created_at < ?
    `).get(params.profileId, params.intentId, params.beforeCutoff) as { total: number; review_count: number } | undefined;

    const afterData = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN c.policy_route = 'REVIEW_REQUIRED' THEN 1 ELSE 0 END) as review_count
      FROM candidates c
      JOIN sessions s ON s.id = c.session_id
      WHERE s.profile_id = ? AND c.intent_label = ? AND c.created_at >= ?
    `).get(params.profileId, params.intentId, params.afterCutoff) as { total: number; review_count: number } | undefined;

    // UNCLEAR when minimum attempts not met — NEVER invent a trend
    if ((beforeData?.total ?? 0) < params.minimumEligibleAttempts || (afterData?.total ?? 0) < params.minimumEligibleAttempts) {
      return {
        verdict: 'UNCLEAR',
        before_count: beforeData?.review_count ?? null,
        after_count: afterData?.review_count ?? null,
        delta: null,
        reason: `Insufficient eligible attempts. Minimum ${params.minimumEligibleAttempts} required in each window. Found ${beforeData?.total ?? 0} before and ${afterData?.total ?? 0} after.`,
        minimum_attempts_met: false,
      };
    }

    const beforeTotal = beforeData!.total;
    const afterTotal = afterData!.total;
    const beforeRate = (beforeData!.review_count ?? 0) / beforeTotal;
    const afterRate = (afterData!.review_count ?? 0) / afterTotal;
    const delta = afterRate - beforeRate;
    const THRESHOLD = 0.1;

    let verdict: 'IMPROVED' | 'STABLE' | 'WORSE';
    let reason: string;

    if (delta < -THRESHOLD) {
      verdict = 'IMPROVED';
      reason = `Review rate reduced from ${Math.round(beforeRate * 100)}% to ${Math.round(afterRate * 100)}%. Review cases: ${beforeData!.review_count} before → ${afterData!.review_count} after.`;
    } else if (delta > THRESHOLD) {
      verdict = 'WORSE';
      reason = `Review rate increased from ${Math.round(beforeRate * 100)}% to ${Math.round(afterRate * 100)}%. Review cases: ${beforeData!.review_count} before → ${afterData!.review_count} after.`;
    } else {
      verdict = 'STABLE';
      reason = `Review rate unchanged (${Math.round(beforeRate * 100)}% → ${Math.round(afterRate * 100)}%). Difference within ±10% threshold.`;
    }

    return {
      verdict,
      before_count: beforeData!.review_count,
      after_count: afterData!.review_count,
      delta: Math.round(delta * 100) / 100,
      reason,
      minimum_attempts_met: true,
    };
  }
}
