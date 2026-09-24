import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hand, BookOpen, UserCheck, Wifi, Shield, ChevronRight, CheckCircle } from 'lucide-react';

const GESTURES = [
  { intent: 'HELP', caption: 'I need help.', category: 'EMERGENCY', emoji: '🆘', description: 'Closed fist, thumb up on open palm' },
  { intent: 'WATER', caption: 'I need water.', category: 'BASIC', emoji: '💧', description: 'Three fingers in W shape near mouth' },
  { intent: 'FOOD', caption: 'I need food.', category: 'BASIC', emoji: '🍽️', description: 'Fingertips brought toward lips' },
  { intent: 'PAIN', caption: 'I am in pain.', category: 'MEDICAL', emoji: '😣', description: 'Index fingers twisted near discomfort' },
  { intent: 'DOCTOR', caption: 'I need a doctor.', category: 'MEDICAL', emoji: '🏥', description: 'Bent hand tapping inner wrist pulse' },
  { intent: 'YES', caption: 'Yes.', category: 'CONVERSATIONAL', emoji: '✅', description: 'Closed fist nodding up and down' },
  { intent: 'NO', caption: 'No.', category: 'CONVERSATIONAL', emoji: '❌', description: 'Index and middle fingers snapping to thumb' },
  { intent: 'THANK_YOU', caption: 'Thank you.', category: 'CONVERSATIONAL', emoji: '🙏', description: 'Open hand from chin moving outward' },
  { intent: 'REPEAT', caption: 'Please repeat.', category: 'ASSISTANCE', emoji: '🔁', description: 'Bent hand arcing back toward body' },
  { intent: 'WASHROOM', caption: 'I need the washroom.', category: 'BASIC', emoji: '🚻', description: 'T-handshape shaken side to side' },
  { intent: 'MEDICINE', caption: 'I need medicine.', category: 'MEDICAL', emoji: '💊', description: 'Middle finger grinding on palm' },
];

const CATEGORY_COLORS: Record<string, string> = {
  EMERGENCY: 'bg-red-500/15 border-red-500/30 text-red-300',
  BASIC: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  MEDICAL: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
  CONVERSATIONAL: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
  ASSISTANCE: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
};

const WHO_IS_IT_FOR = [
  {
    icon: <Hand size={22} className="text-cyan-400" />,
    role: 'Students',
    description: 'People learning to communicate through gestures. Practice at your own pace with a structured curriculum and a tutor powered by teacher-approved notes.',
    accent: 'border-cyan-400/30',
  },
  {
    icon: <UserCheck size={22} className="text-violet-400" />,
    role: 'Teachers / Trainers',
    description: 'Review gesture candidates flagged for approval. Add notes, correct errors, and build the knowledge base that the tutor draws from.',
    accent: 'border-violet-400/30',
  },
  {
    icon: <BookOpen size={22} className="text-purple-400" />,
    role: 'Communication Support Staff',
    description: 'Use the real-world communication board during in-person interactions. Gestures are captured, approved, and spoken aloud.',
    accent: 'border-purple-400/30',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg, #0f1729 0%, #111827 40%, #0f172a 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(45,226,230,0.3) 0%, transparent 70%)' }} />
        <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 text-teal-300 text-xs font-mono font-semibold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Local-first · No cloud · All data stays on your device
            </div>
            <h1 className="text-6xl font-extrabold tracking-tight mb-4">
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(90deg, #2DE2E6, #7C3AED)' }}>
                SignLoop
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-3">
              A gesture training and communication workstation that works entirely on your machine.
            </p>
            <p className="text-sm text-slate-500 max-w-xl mx-auto mb-10">
              Students practice gestures. Teachers review and approve. A local AI tutor answers from teacher-approved notes only — it never invents answers.
            </p>
            <motion.button
              onClick={() => navigate('/select')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-slate-950 font-extrabold text-lg tracking-wide transition-all"
              style={{ background: 'linear-gradient(90deg, #2DE2E6, #06b6d4)' }}
            >
              <Hand size={20} />
              Choose Your Role & Start
              <ChevronRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Who is it for */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-center mb-2">Who uses SignLoop?</h2>
          <p className="text-slate-500 text-sm text-center mb-8">Three roles, one shared platform</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHO_IS_IT_FOR.map(item => (
              <div key={item.role}
                className={`rounded-2xl border p-6 space-y-3 ${item.accent}`}
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center bg-white/5">
                  {item.icon}
                </div>
                <h3 className="font-bold text-white text-lg">{item.role}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Gestures grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-center mb-2">The 11 supported gestures</h2>
          <p className="text-slate-500 text-sm text-center mb-8">
            These are the exact sign intents the classifier can recognise. Each one maps to a spoken caption.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {GESTURES.map((g, i) => (
              <motion.div
                key={g.intent}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/8 p-4 space-y-2 hover:border-white/20 transition-all cursor-default"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="text-3xl">{g.emoji}</div>
                <div className="font-bold text-white text-sm uppercase tracking-wide">{g.intent}</div>
                <div className="text-xs text-slate-400 italic">"{g.caption}"</div>
                <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${CATEGORY_COLORS[g.category] ?? ''}`}>
                  {g.category}
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">{g.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
          <p className="text-slate-500 text-sm text-center mb-8">The pipeline from gesture to spoken caption</p>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-teal-500/50 via-violet-500/30 to-transparent" />
            {[
              { step: 1, label: 'Gesture Captured', detail: 'Via glove sensor, camera, or a simulated/replay fixture for testing', color: 'text-teal-400', bg: 'bg-teal-400' },
              { step: 2, label: 'Quality Gate', detail: '4 sensor checks must pass (signal, frame rate, hand detection, motion range)', color: 'text-blue-400', bg: 'bg-blue-400' },
              { step: 3, label: 'Model Score & Routing', detail: 'Score ≥ 75% → CANDIDATE_READY. Score < 75% → REVIEW_REQUIRED. No score → SIGNAL_INVALID', color: 'text-amber-400', bg: 'bg-amber-400' },
              { step: 4, label: 'Human Decision', detail: 'A teacher or staff member CONFIRMs, CORRECTs, or REJECTs before the caption is revealed', color: 'text-violet-400', bg: 'bg-violet-400' },
              { step: 5, label: 'Caption Displayed & Spoken', detail: 'Only after CONFIRM or CORRECT is the English caption shown and audio played', color: 'text-emerald-400', bg: 'bg-emerald-400' },
            ].map(item => (
              <div key={item.step} className="flex gap-5 mb-6 pl-14 relative">
                <div className={`absolute left-3 w-6 h-6 rounded-full ${item.bg} flex items-center justify-center text-slate-950 text-xs font-black`}>
                  {item.step}
                </div>
                <div>
                  <p className={`font-bold text-sm ${item.color}`}>{item.label}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Privacy promise */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-4">
            <Shield size={28} className="text-emerald-400 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-white text-lg mb-2">100% local. No internet required.</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'All data stored in SQLite on this device only',
                  'No account, no login, no cloud sync',
                  'Export your data anytime as a file',
                  'Revoke consent and delete data at any time',
                  'The AI tutor only reads approved local notes',
                  'Every decision is permanently logged for audit',
                ].map(point => (
                  <div key={point} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <Wifi size={28} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm mb-6">Running locally on <span className="text-slate-300 font-mono">http://localhost:5173</span></p>
        <motion.button
          onClick={() => navigate('/select')}
          whileHover={{ scale: 1.03 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-400/40 bg-teal-400/10 text-teal-300 font-semibold text-sm hover:bg-teal-400/15 transition-all"
        >
          <Hand size={16} />
          Get Started → Choose Your Role
        </motion.button>
      </div>
    </div>
  );
}
