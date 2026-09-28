/**
 * GestureVisual — SVG hand diagrams for all 11 ISL signs used in SignLoop.
 * Each shape reflects the actual finger flex configuration detected by the glove.
 *
 * Finger layout (left to right in SVG):
 *   Pinky · Ring · Middle · Index · Thumb
 *
 * Extended finger = tall rectangle. Bent finger = short rectangle.
 * Thumb is drawn angled on the right side.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ── Shared hand renderer ─────────────────────────────────────────────────────

interface FingerState {
  pinky: boolean;   // true = extended
  ring: boolean;
  middle: boolean;
  index: boolean;
  thumb: boolean;
  thumbAngle?: number; // degrees from vertical, default 40
}

const FINGER_COLORS = {
  extended: '#8b5cf6',
  bent: '#334155',
  palm: '#1e293b',
  outline: 'rgba(139,92,246,0.4)',
};

function HandSVG({
  fingers,
  color = '#8b5cf6',
  label,
  description,
}: {
  fingers: FingerState;
  color?: string;
  label: string;
  description: string;
}) {
  const palmW = 90;
  const palmH = 55;
  const palmX = 25;
  const palmY = 95;

  // Each finger: [x-center, extended-height, bent-height]
  const fingerDefs = [
    { key: 'pinky',  cx: 32, extH: 62, bentH: 22, active: fingers.pinky },
    { key: 'ring',   cx: 50, extH: 75, bentH: 22, active: fingers.ring },
    { key: 'middle', cx: 68, extH: 82, bentH: 22, active: fingers.middle },
    { key: 'index',  cx: 86, extH: 75, bentH: 22, active: fingers.index },
  ] as const;

  const thumbAngle = fingers.thumbAngle ?? 40;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="175" viewBox="0 0 140 175" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Glowing background circle */}
        <circle cx="70" cy="95" r="62" fill={`${color}10`} />
        <circle cx="70" cy="95" r="62" stroke={`${color}25`} strokeWidth="1" />

        {/* Palm */}
        <rect
          x={palmX} y={palmY} width={palmW} height={palmH}
          rx="12" fill={FINGER_COLORS.palm} stroke={FINGER_COLORS.outline} strokeWidth="1.5"
        />

        {/* Fingers */}
        {fingerDefs.map(f => {
          const h = f.active ? f.extH : f.bentH;
          const y = palmY - h;
          return (
            <g key={f.key}>
              <rect
                x={f.cx - 8} y={y} width={16} height={h + 10}
                rx="8"
                fill={f.active ? color : FINGER_COLORS.bent}
                opacity={f.active ? 1 : 0.5}
              />
              {/* Knuckle line */}
              <rect x={f.cx - 8} y={palmY - 2} width={16} height={4} rx="2"
                fill={f.active ? `${color}cc` : '#1e3a5f'} />
            </g>
          );
        })}

        {/* Thumb */}
        {(() => {
          const tx = 114;
          const ty = palmY + 10;
          const extH = 48;
          const bentH = 20;
          const h = fingers.thumb ? extH : bentH;
          void h; // used implicitly via fingers.thumb check below
          return (
            <g transform={`rotate(-${thumbAngle}, ${tx}, ${ty})`}>
              <rect
                x={tx - 8} y={ty - (fingers.thumb ? extH : bentH)} width={16}
                height={(fingers.thumb ? extH : bentH) + 8}
                rx="8"
                fill={fingers.thumb ? color : FINGER_COLORS.bent}
                opacity={fingers.thumb ? 1 : 0.5}
              />
            </g>
          );
        })()}

        {/* Sensor dots on each finger tip (glove aesthetic) */}
        {fingerDefs.map(f => {
          const h = f.active ? f.extH : f.bentH;
          return (
            <circle
              key={`dot-${f.key}`}
              cx={f.cx} cy={palmY - h + 5}
              r="3"
              fill={f.active ? 'white' : '#475569'}
              opacity={f.active ? 0.8 : 0.4}
            />
          );
        })}
      </svg>

      {/* Description */}
      <div className="text-center max-w-[200px]">
        <p className="text-white font-bold text-sm uppercase tracking-wide">{label}</p>
        <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ── Gesture definitions — each maps to glove sensor positions ───────────────

const GESTURE_SHAPES: Record<string, {
  fingers: FingerState;
  color: string;
  description: string;
}> = {
  HELP: {
    fingers: { pinky: false, ring: false, middle: false, index: false, thumb: true, thumbAngle: 20 },
    color: '#ef4444',
    description: 'Closed fist, thumb extended upward. Rest on open palm and lift together.',
  },
  WATER: {
    fingers: { pinky: false, ring: false, middle: true, index: true, thumb: false, thumbAngle: 50 },
    color: '#3b82f6',
    description: 'W-shape: index and middle fingers extended. Tap near chin.',
  },
  FOOD: {
    fingers: { pinky: false, ring: true, middle: true, index: true, thumb: true, thumbAngle: 35 },
    color: '#f59e0b',
    description: 'Flattened O-shape, fingertips together. Bring toward lips repeatedly.',
  },
  PAIN: {
    fingers: { pinky: false, ring: false, middle: false, index: true, thumb: false, thumbAngle: 55 },
    color: '#ef4444',
    description: 'Index finger pointed. Twist slightly near area of discomfort.',
  },
  DOCTOR: {
    fingers: { pinky: false, ring: false, middle: true, index: true, thumb: false, thumbAngle: 45 },
    color: '#06b6d4',
    description: 'Bent middle and index tapping the inner wrist pulse point.',
  },
  MEDICINE: {
    fingers: { pinky: false, ring: true, middle: false, index: false, thumb: false, thumbAngle: 50 },
    color: '#8b5cf6',
    description: 'Ring finger bent down. Middle finger taps palm in circular motion.',
  },
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
  const gesture = gestureKey ? GESTURE_SHAPES[gestureKey] : null;

  return (
    <AnimatePresence>
      {gestureKey && gesture && (
        <motion.div
          key={gestureKey}
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="rounded-2xl border p-5 relative"
          style={{
            background: `${gesture.color}08`,
            borderColor: `${gesture.color}35`,
            boxShadow: `0 0 32px ${gesture.color}18`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>

          <div className="flex flex-col items-center gap-2">
            {/* Label badge */}
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest"
              style={{ color: gesture.color, borderColor: `${gesture.color}40`, background: `${gesture.color}12` }}
            >
              <span>{emoji}</span>
              <span>{gestureKey}</span>
            </div>

            {/* SVG hand */}
            <HandSVG
              fingers={gesture.fingers}
              color={gesture.color}
              label={gestureKey}
              description={gesture.description}
            />

            {/* Finger legend */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ background: gesture.color }} />
                <span className="text-[9px] text-slate-500 font-mono uppercase">Extended</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-700" />
                <span className="text-[9px] text-slate-500 font-mono uppercase">Bent</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
