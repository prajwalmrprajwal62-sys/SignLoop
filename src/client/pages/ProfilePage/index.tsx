import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MonoLabel } from '../../components/common/MonoLabel';
import { useProfileStore } from '../../stores/profileStore';
import { apiGet, apiPost } from '../../api/client';
import { User, AlertTriangle, Download, Brain, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface ExportData {
  profile: { id: string; pseudonymous_code: string; role: string };
  sessions: unknown[];
  candidates: unknown[];
  decisions: unknown[];
  approved_outputs: unknown[];
  events_count: number;
}

// Gesture emoji map for visual profile display
const GESTURE_EMOJI: Record<string, string> = {
  HELP: '🆘', WATER: '💧', FOOD: '🍽️', PAIN: '😣', DOCTOR: '🏥',
  MEDICINE: '💊', WASHROOM: '🚻', YES: '✅', NO: '❌', REPEAT: '🔁', THANK_YOU: '🙏',
};

type ProfileTab = 'learning' | 'realworld';

export function ProfilePage() {
  const navigate = useNavigate();
  const { activeProfileId, pseudonymousCode, role, contextType, clearProfile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('learning');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [consentData, setConsentData] = useState<ConsentStatus[]>([]);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    apiGet<{ ok: boolean; consents: ConsentStatus[] }>(`/api/privacy/status/${activeProfileId}`)
      .then(res => setConsentData(res.consents ?? []))
      .catch(console.error);
    apiGet<{ ok: boolean; followUps: FollowUp[] }>(`/api/practice/followups?profile_id=${activeProfileId}`)
      .then(res => setFollowUps(res.followUps ?? []))
      .catch(console.error);
  }, [activeProfileId]);

  const handleExport = async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const res = await apiGet<ExportData>(`/api/privacy/export/${activeProfileId}`);
      setExportData(res);
      setShowExport(true);
    } catch (err) {
      setMsg({ type: 'error', text: `Export failed: ${String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signloop-export-${pseudonymousCode ?? 'profile'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!activeProfileId) return;
    if (!window.confirm('Delete all raw session data? Your audit log is retained per retention policy. This cannot be undone.')) return;
    setLoading(true);
    try {
      await apiPost(`/api/privacy/delete/${activeProfileId}`, { confirm: true });
      setMsg({ type: 'success', text: 'Profile marked DELETED. Raw session data cleared.' });
    } catch (err) {
      setMsg({ type: 'error', text: `Delete failed: ${String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeProfileId) return;
    if (!window.confirm('Revoke all consent? Future RAG retrieval will be blocked. Continue?')) return;
    setLoading(true);
    try {
      await apiPost(`/api/privacy/revoke/${activeProfileId}`, {});
      clearProfile();
      navigate('/');
    } catch (err) {
      setMsg({ type: 'error', text: `Revoke failed: ${String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const activeConsent = consentData.find(c => c.status === 'ACTIVE');
  const consentBadgeStatus = activeConsent ? 'ACTIVE' : 'REVOKED';
  const reviewCaseCount = followUps.length;

  // Compute most-reviewed intents from follow-ups for Communication Memory
  const intentCounts = followUps.reduce<Record<string, number>>((acc, f) => {
    acc[f.intent_id] = (acc[f.intent_id] ?? 0) + 1;
    return acc;
  }, {});
  const topReviewed = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 font-mono text-sm">No profile selected. Return to home.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {msg && (
        <div className={`rounded-xl border p-3 text-sm font-mono ${
          msg.type === 'success'
            ? 'border-emerald-500/30 text-emerald-300'
            : 'border-red-500/30 text-red-400'
        }`} style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.08)' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Profile summary card */}
      <GlassCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <User size={24} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-1.5">
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
            <p className="text-xs font-mono text-slate-500">
              {contextType?.replace(/_/g, ' ')} · Local SQLite · SAVED_LOCALLY
            </p>
            <p className="text-xs font-mono text-slate-600">
              All data stored on this device only — never transmitted to any server
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Context tabs */}
      <div className="flex gap-0 border-b border-white/8">
        {([
          { key: 'learning' as ProfileTab, label: 'Learning / Practice' },
          { key: 'realworld' as ProfileTab, label: 'Real-world Communication' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== LEARNING/PRACTICE TAB ===== */}
      {activeTab === 'learning' && (
        <motion.div key="learning" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Communication Memory — the personalized summary */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-cyan-400" />
              <SectionHeader>Communication Memory</SectionHeader>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              SignLoop remembers {pseudonymousCode}'s complete interaction history and uses it to personalize the next session.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mb-1">Review Cases</p>
                <p className="text-3xl font-extrabold text-white">{reviewCaseCount}</p>
                <p className="text-slate-500 text-xs mt-1">in last 20 eligible attempts</p>
              </div>
              <div className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mb-1">Context</p>
                <p className="text-sm font-semibold text-white">LEARNING PRACTICE</p>
                <p className="text-slate-500 text-xs mt-1">Active consent granted</p>
              </div>
            </div>

            {/* Most reviewed intents */}
            {topReviewed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={12} className="text-amber-400" />
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Most Reviewed Intents</p>
                </div>
                <div className="space-y-1.5">
                  {topReviewed.map(([intent, count]) => (
                    <div key={intent} className="flex items-center gap-3">
                      <span className="text-xl">{GESTURE_EMOJI[intent] ?? '👋'}</span>
                      <span className="text-sm font-mono text-white uppercase flex-1">{intent}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full bg-amber-400/60"
                          style={{ width: `${Math.min(count * 20, 80)}px` }}
                        />
                        <span className="text-xs text-slate-500 font-mono">{count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Open follow-ups */}
          <GlassCard className="p-5">
            <SectionHeader className="mb-3">Open Follow-ups</SectionHeader>
            {followUps.length > 0 ? (
              <div className="space-y-2">
                {followUps.map(f => (
                  <div key={f.case_id} className="flex items-center gap-3 p-3 rounded-xl border border-white/6"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-xl">{GESTURE_EMOJI[f.intent_id] ?? '👋'}</span>
                    <span className="text-white font-mono font-semibold text-sm uppercase flex-1">{f.intent_id}</span>
                    <StatusBadge status={f.verdict ?? 'UNCLEAR'} size="xs" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm font-mono">No open follow-up cases. Great progress!</p>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ===== REAL-WORLD TAB ===== */}
      {activeTab === 'realworld' && (
        <motion.div key="realworld" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-purple-400" />
              <SectionHeader>Real-world Communication Memory</SectionHeader>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              This section records interactions from real-world communication sessions — not practice sessions.
              When a staff member or teacher uses the communication board with {pseudonymousCode}, those sessions are stored here.
            </p>
            <div className="rounded-xl border border-white/8 p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-slate-500 text-sm font-mono">No real-world communication sessions recorded yet.</p>
              <p className="text-slate-600 text-xs mt-1">Go to the COMMS tab to start a communication session.</p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Data controls */}
      <div className="rounded-2xl border border-red-900/40 p-5 space-y-4" style={{ background: 'rgba(127,29,29,0.1)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <SectionHeader className="text-red-400">Data Controls</SectionHeader>
        </div>
        <p className="text-xs text-slate-500 font-mono">
          All data is stored locally on this device only. Export as a file or delete below.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => void handleExport()}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 border border-white/10"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <Download size={13} /> Export My Data
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={loading}
            className="h-10 px-4 rounded-lg border border-red-500/30 text-red-200 text-sm font-semibold transition-all disabled:opacity-50 hover:bg-red-900/30"
            style={{ background: 'rgba(127,29,29,0.2)' }}
          >
            Delete Raw Data
          </button>
          <button
            onClick={() => void handleRevoke()}
            disabled={loading}
            className="h-10 px-4 rounded-lg border border-red-500/30 text-red-200 text-sm font-semibold transition-all disabled:opacity-50 hover:bg-red-900/30"
            style={{ background: 'rgba(127,29,29,0.2)' }}
          >
            Revoke Consent
          </button>
        </div>
      </div>

      {/* Export preview modal */}
      {showExport && exportData && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            style={{ background: '#1e293b' }}>
            <div className="flex justify-between items-center p-5 border-b border-white/8">
              <div>
                <h3 className="text-white font-bold">Your Exported Data</h3>
                <p className="text-slate-400 text-xs mt-0.5">SAVED_LOCALLY — stored in local SQLite only, never transmitted</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all"
                >
                  <Download size={12} /> Download .json
                </button>
                <button onClick={() => setShowExport(false)} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
              </div>
            </div>
            {/* Human-readable summary */}
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Profile', value: exportData.profile?.pseudonymous_code ?? pseudonymousCode ?? '—' },
                  { label: 'Role', value: exportData.profile?.role ?? role ?? '—' },
                  { label: 'Events recorded', value: String(exportData.events_count ?? 0) },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-white/8 p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">{item.label}</p>
                    <p className="text-white font-bold text-sm mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs font-mono mb-2">Raw JSON export:</p>
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap rounded-xl p-4 overflow-auto max-h-64"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                {JSON.stringify(exportData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
