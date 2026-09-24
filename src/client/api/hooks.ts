import { useState, useEffect } from 'react';
import { apiGet } from './client';

// GET /api/profiles
export function useProfiles() {
  const [profiles, setProfiles] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ ok: boolean; profiles: unknown[] }>('/api/profiles')
      .then((data) => setProfiles(data.profiles ?? []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return { profiles, loading, error };
}

// GET /api/fixtures
export function useFixtures() {
  const [fixtures, setFixtures] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ ok: boolean; fixtures: unknown[] }>('/api/fixtures')
      .then((data) => setFixtures(data.fixtures ?? []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return { fixtures, loading, error };
}

// GET /api/practice/tasks?profile_id=...
export function usePracticeTasks(profileId: string | null) {
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    apiGet<{ ok: boolean; tasks: unknown[] }>(`/api/practice/tasks?profile_id=${profileId}`)
      .then((data) => setTasks(data.tasks ?? []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [profileId]);

  return { tasks, loading, error };
}

// GET /api/knowledge/sources
export function useKnowledgeSources(profileId?: string | null) {
  const [sources, setSources] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = profileId
      ? `/api/knowledge/sources?profile_id=${profileId}`
      : '/api/knowledge/sources';
    apiGet<{ ok: boolean; sources: unknown[] }>(url)
      .then((data) => setSources(data.sources ?? []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [profileId]);

  return { sources, loading, error };
}
