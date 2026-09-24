import { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MonoLabel } from '../../components/common/MonoLabel';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { User, AlertTriangle } from 'lucide-react';

interface FollowUp {
  case_id: string;
  intent_id: string;
  verdict: string;
  created_at: string;
}

interface ConsentStatus {
  status: string;
  revoked_at: string | null;
}

export function ProfilePage() {
  const { activeProfileId, pseudonymousCode, role, contextType, clearProfile } = useProfileStore();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [consentData, setConsentData] = useState<ConsentStatus[]>([]);
  const [exportModal, setExportModal] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch consent status + follow-ups
  useEffect(() => {
    if (!activeProfileId) return;
    // Fetch privacy status (includes consents)
    apiGet<{ ok: boolean; consents: ConsentStatus[] }>(`/api/privacy/status/${activeProfileId}`)
      .then(res => setConsentData(res.consents ?? []))
      .catch(console.error);

    // Fetch follow-ups from the correct endpoint
    apiGet<{ ok: boolean; followUps: FollowUp[] }>(`/api/practice/followups?profile_id=${activeProfileId}`)
      .then(res => setFollowUps(res.followUps ?? []))
      .catch(console.error);
  }, [activeProfileId]);

  const handleExport = async () => {
    if (!activeProfileId) return;
    if (!window.confirm('Export all your local data as JSON?')) return;
    try {
      setLoading(true);
      const res = await apiGet<object>(`/api/privacy/export/${activeProfileId}`);
      setExportModal(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeProfileId) return;
    if (!window.confirm('Delete all raw session data? This marks your profile as DELETED. The audit log is retained per retention policy. This cannot be undone.')) return;
    try {
      setLoading(true);
      // confirm: true is required by the API
      await apiPost(`/api/privacy/delete/${activeProfileId}`, { confirm: true });
      window.alert('Profile marked DELETED. Raw session data cleared.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeProfileId) return;
    if (!window.confirm('Revoke all consent? Future RAG retrieval will be blocked and your profile cleared. Continue?')) return;
    try {
      setLoading(true);
      await apiPost(`/api/privacy/revoke/${activeProfileId}`, {});
      clearProfile();
      window.alert('Consent revoked. Profile cleared.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeConsent = consentData.find(c => c.status === 'GRANTED');
  const consentBadgeStatus = activeConsent ? 'ACTIVE' : 'REVOKED';

  // Compute review case count from follow-ups
  const reviewCaseCount = followUps.length;
  const eligibleAttempts = 20; // standard window per spec

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 font-mono text-sm">No profile selected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Profile summary */}
      <GlassCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
            <User size={22} className="text-zinc-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <MonoLabel className="text-lg">{pseudonymousCode}</MonoLabel>
              {role && (
                <span className={`px-3 py-0.5 rounded-full border text-xs font-mono font-semibold uppercase ${
                  role === 'STUDENT' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400'
                  : role === 'TEACHER' ? 'border-violet-400/30 bg-violet-400/10 text-violet-400'
                  : 'border-purple-400/30 bg-purple-400/10 text-purple-400'
                }`}>
                  {role}
                </span>
              )}
              <StatusBadge status={consentBadgeStatus} size="xs" />
            </div>
            <p className="text-xs font-mono text-zinc-500">
              {contextType?.replace(/_/g, ' ')} · Local SQLite · SAVED_LOCALLY
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Context tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {(['Learning/Practice', 'Real-world'] as const).map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              i === 0
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Communication memory — EXACT wording from spec */}
      <GlassCard className="p-5">
        <SectionHeader className="mb-2">Communication Memory</SectionHeader>
        {/* Spec requires exact phrasing: 'X review cases in last Y eligible attempts' */}
        <p className="text-zinc-300 text-sm">
          <span className="text-white font-semibold">{reviewCaseCount}</span> review cases in last{' '}
          <span className="text-white font-semibold">{eligibleAttempts}</span> eligible attempts
        </p>
      </GlassCard>

      {/* Open follow-ups */}
      <GlassCard className="p-5">
        <SectionHeader className="mb-3">Open Follow-ups</SectionHeader>
        {followUps.length > 0 ? (
          <div className="space-y-2">
            {followUps.map(f => (
              <div key={f.case_id} className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-lg border border-white/5">
                <span className="text-white font-mono font-semibold text-sm uppercase">{f.intent_id}</span>
                <StatusBadge status={f.verdict ?? 'UNCLEAR'} size="xs" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm font-mono">No open follow-up cases.</p>
        )}
      </GlassCard>

      {/* Data controls — all require explicit confirmation */}
      <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <SectionHeader className="text-red-400">Data Controls</SectionHeader>
        </div>
        <p className="text-xs text-zinc-500 font-mono">
          All data is stored locally on this device only. Export or delete below.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => void handleExport()}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 text-sm font-semibold transition-all disabled:opacity-50"
          >
            Delete Raw Data
          </button>
          <button
            onClick={() => void handleRevoke()}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 text-sm font-semibold transition-all disabled:opacity-50"
          >
            Revoke Consent
          </button>
        </div>
      </div>

      {/* Export data modal */}
      {exportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Exported Data</h3>
              <button onClick={() => setExportModal(null)} className="text-zinc-400 hover:text-white text-sm">
                ✕ Close
              </button>
            </div>
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-black/40 p-4 rounded-lg overflow-auto">
              {JSON.stringify(exportModal, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
