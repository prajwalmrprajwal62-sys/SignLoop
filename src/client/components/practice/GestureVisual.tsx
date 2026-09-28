/**
 * GestureVisual — shows a real glove photo for each ISL sign.
 * 6 signs have real photos; remaining 5 fall back to SVG hand diagrams.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ── Which gestures have a real photo in /public/gestures/ ───────────────────
const PHOTO_GESTURES = new Set(['HELP', 'WATER', 'FOOD', 'PAIN', 'DOCTOR', 'MEDICINE']);

// ── SVG fallback — for gestures without a real photo ────────────────────────
interface FingerState {
  pinky: boolean; ring: boolean; middle: boolean; index: boolean; thumb: boolean;
  thumbAngle?: number;
}

const FINGER_COLORS = { extended: '#8b5cf6', bent: '#334155', palm: '#1e293b', outline: 'rgba(139,92,246,0.4)' };

function HandSVG({ fingers, color }: { fingers: FingerState; color: string }) {
  const palmY = 95;
  const fingerDefs = [
    { key: 'pinky',  cx: 32, extH: 62, bentH: 22, active: fingers.pinky },
    { key: 'ring',   cx: 50, extH: 75, bentH: 22, active: fingers.ring },
    { key: 'middle', cx: 68, extH: 82, bentH: 22, active: fingers.middle },
    { key: 'index',  cx: 86, extH: 75, bentH: 22, active: fingers.index },
  ] as const;
  const thumbAngle = fingers.thumbAngle ?? 40;

  return (
    <svg width="140" height="175" viewBox="0 0 140 175" fill="none">
      <circle cx="70" cy="95" r="62" fill={`${color}10`} />
      <circle cx="70" cy="95" r="62" stroke={`${color}25`} strokeWidth="1" />
      <rect x={25} y={palmY} width={90} height={55} rx="12" fill={FINGER_COLORS.palm} stroke={FINGER_COLORS.outline} strokeWidth="1.5" />
      {fingerDefs.map(f => {
        const h = f.active ? f.extH : f.bentH;
        return (
          <g key={f.key}>
            <rect x={f.cx - 8} y={palmY - h} width={16} height={h + 10} rx="8"
              fill={f.active ? color : FINGER_COLORS.bent} opacity={f.active ? 1 : 0.5} />
            <rect x={f.cx - 8} y={palmY - 2} width={16} height={4} rx="2"
              fill={f.active ? `${color}cc` : '#1e3a5f'} />
            <circle cx={f.cx} cy={palmY - h + 5} r="3"
              fill={f.active ? 'white' : '#475569'} opacity={f.active ? 0.8 : 0.4} />
          </g>
        );
      })}
      <g transform={`rotate(-${thumbAngle}, 114, ${palmY + 10})`}>
        <rect x={106} y={palmY + 10 - (fingers.thumb ? 48 : 20)} width={16}
          height={(fingers.thumb ? 48 : 20) + 8} rx="8"
          fill={fingers.thumb ? color : FINGER_COLORS.bent} opacity={fingers.thumb ? 1 : 0.5} />
      </g>
    </svg>
  );
}

// ── Gesture data for SVG fallbacks + descriptions ───────────────────────────
const GESTURE_DATA: Record<string, {
  fingers?: FingerState;
  color: string;
  description: string;
}> = {
  HELP:     { color: '#ef4444', description: 'Closed fist, thumb extended upward. Rest on open palm and lift together.' },
  WATER:    { color: '#3b82f6', description: 'W-shape: index and middle fingers extended. Tap near chin.' },
  FOOD:     { color: '#f59e0b', description: 'Flattened O-shape, fingertips together. Bring toward lips repeatedly.' },
  PAIN:     { color: '#ef4444', description: 'Index finger pointed. Twist slightly near area of discomfort.' },
  DOCTOR:   { color: '#06b6d4', description: 'Bent middle and index tapping the inner wrist pulse point.' },
  MEDICINE: { color: '#8b5cf6', description: 'Ring finger bent down, taps palm in circular motion.' },
  WASHROOM: {
    fingers: { pinky: false, ring: false, middle: false, index: false, thumb: false, thumbAngle: 30 },
    color: '#6366f1',
    description: 'Closed fist, all fingers in. Shake side to side for "W" (washroom).',
  },
  YES: {
    fingers: { pinky: false, ring: false, middle: false, index: false, thumb: true, thumbAngle: 15 },
    color: '#10b981',
    description: 'Closed fist with thumb up. Nod the fist forward once for YES.',
  },
  NO: {
    fingers: { pinky: false, ring: false, middle: false, index: true, thumb: false, thumbAngle: 60 },
    color: '#ef4444',
    description: 'Index finger extended, all others closed. Wag side-to-side for NO.',
  },
  REPEAT: {
    fingers: { pinky: false, ring: false, middle: true, index: true, thumb: true, thumbAngle: 25 },
    color: '#f59e0b',
    description: 'Curved open hand. Rotate forward in a circular motion for REPEAT.',
  },
  THANK_YOU: {
    fingers: { pinky: true, ring: true, middle: true, index: true, thumb: true, thumbAngle: 30 },
    color: '#10b981',
    description: 'Open flat hand, all fingers extended. Touch chin and move forward.',
  },
};

// ── Public component ─────────────────────────────────────────────────────────
interface GestureVisualProps {
  gestureKey: string | null;
  onClose: () => void;
  emoji: string;
}

export function GestureVisual({ gestureKey, onClose, emoji }: GestureVisualProps) {
  const data = gestureKey ? GESTURE_DATA[gestureKey] : null;
  const hasPhoto = gestureKey ? PHOTO_GESTURES.has(gestureKey) : false;

  return (
    <AnimatePresence>
      {gestureKey && data && (
        <motion.div
          key={gestureKey}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="rounded-2xl border overflow-hidden relative"
          style={{
            background: `${data.color}08`,
            borderColor: `${data.color}35`,
            boxShadow: `0 0 28px ${data.color}18`,
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 text-slate-500 hover:text-white transition-colors bg-black/40 rounded-full p-1"
          >
            <X size={13} />
          </button>

          {/* Badge */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <span>{emoji}</span>
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{ color: data.color, borderColor: `${data.color}50`, background: `${data.color}15` }}
            >
              {gestureKey}
            </span>
          </div>

          {/* Image or SVG */}
          {hasPhoto ? (
            <div className="px-3 pb-1">
              <img
                src={`/gestures/${gestureKey.toLowerCase()}.jpg`}
                alt={`${gestureKey} hand sign`}
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: '220px', objectPosition: 'center top' }}
              />
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <HandSVG
                fingers={data.fingers ?? { pinky: false, ring: false, middle: false, index: false, thumb: false }}
                color={data.color}
              />
            </div>
          )}

          {/* Description */}
          <div className="px-4 pb-4">
            <p className="text-slate-400 text-[11px] leading-relaxed">{data.description}</p>
            {!hasPhoto && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: data.color }} />
                  <span className="text-[9px] text-slate-600 font-mono uppercase">Extended</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="text-[9px] text-slate-600 font-mono uppercase">Bent</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
