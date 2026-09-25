/**
 * glove_bridge.ts — Hardware bridge to the ESP32 sensor glove
 *
 * Connects via TCP to `glove_link.py` on port 3333.
 * Reads sensor packets: 5 flex sensor values + MPU6050 accelerometer/gyro data.
 * Runs a threshold-based gesture classifier (no ML — just flex threshold rules).
 * When a gesture is detected with a sufficient model score, POSTs to the
 * candidate API so the SignLoop pipeline can route it.
 */
import net from 'node:net';
import http from 'node:http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BridgeStatus = 'CONNECTED' | 'CONNECTING' | 'NOT_CONNECTED' | 'ERROR';

interface SensorPacket {
  flex: [number, number, number, number, number];
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
}

interface GestureRule {
  label: string;
  /** Returns true when the flex readings satisfy this gesture's pattern. */
  match: (f: number[]) => boolean;
  /** How many flex-sensor conditions does this gesture check? */
  conditionCount: number;
  /**
   * Returns how many individual flex conditions passed.
   * Used to compute model_score = matchedConditions / conditionCount.
   */
  matchedCount: (f: number[]) => number;
}

// ---------------------------------------------------------------------------
// Gesture threshold rules (simplified for demo)
// ---------------------------------------------------------------------------

const GESTURE_RULES: GestureRule[] = [
  {
    label: 'HELP',
    match: (f) => f[0]! > 800 && f[1]! > 800 && f[2]! > 800 && f[3]! > 800 && f[4]! > 800,
    conditionCount: 5,
    matchedCount: (f) => [f[0]! > 800, f[1]! > 800, f[2]! > 800, f[3]! > 800, f[4]! > 800].filter(Boolean).length,
  },
  {
    label: 'WATER',
    match: (f) => (f[0]! + f[1]!) > 1200 && f[2]! < 400,
    conditionCount: 3,
    matchedCount: (f) => [(f[0]! + f[1]!) > 1200, f[2]! < 400].filter(Boolean).length + (f[0]! > 0 ? 1 : 0),
  },
  {
    label: 'FOOD',
    match: (f) => f[0]! > 600 && f[1]! < 400 && f[2]! < 400 && f[3]! < 400 && f[4]! < 400,
    conditionCount: 5,
    matchedCount: (f) => [f[0]! > 600, f[1]! < 400, f[2]! < 400, f[3]! < 400, f[4]! < 400].filter(Boolean).length,
  },
  {
    label: 'YES',
    match: (f) => f[0]! > 800 && f[1]! > 800 && f[2]! < 300,
    conditionCount: 3,
    matchedCount: (f) => [f[0]! > 800, f[1]! > 800, f[2]! < 300].filter(Boolean).length,
  },
  {
    label: 'NO',
    match: (f) => f[0]! < 300 && f[1]! > 800,
    conditionCount: 2,
    matchedCount: (f) => [f[0]! < 300, f[1]! > 800].filter(Boolean).length,
  },
  {
    label: 'PAIN',
    match: (f) => f[3]! > 700 && f[4]! > 700,
    conditionCount: 2,
    matchedCount: (f) => [f[3]! > 700, f[4]! > 700].filter(Boolean).length,
  },
  {
    label: 'DOCTOR',
    match: (f) => f[0]! > 600 && f[1]! > 600 && f[2]! > 600,
    conditionCount: 3,
    matchedCount: (f) => [f[0]! > 600, f[1]! > 600, f[2]! > 600].filter(Boolean).length,
  },
  {
    label: 'WASHROOM',
    match: (f) => f[0]! > 500 && f[4]! > 500,
    conditionCount: 2,
    matchedCount: (f) => [f[0]! > 500, f[4]! > 500].filter(Boolean).length,
  },
  {
    label: 'MEDICINE',
    match: (f) => f[2]! > 700,
    conditionCount: 1,
    matchedCount: (f) => [f[2]! > 700].filter(Boolean).length,
  },
  {
    label: 'REPEAT',
    match: (f) =>
      f[0]! >= 300 && f[0]! <= 600 &&
      f[1]! >= 300 && f[1]! <= 600 &&
      f[2]! >= 300 && f[2]! <= 600 &&
      f[3]! >= 300 && f[3]! <= 600 &&
      f[4]! >= 300 && f[4]! <= 600,
    conditionCount: 5,
    matchedCount: (f) =>
      [
        f[0]! >= 300 && f[0]! <= 600,
        f[1]! >= 300 && f[1]! <= 600,
        f[2]! >= 300 && f[2]! <= 600,
        f[3]! >= 300 && f[3]! <= 600,
        f[4]! >= 300 && f[4]! <= 600,
      ].filter(Boolean).length,
  },
  {
    label: 'THANK_YOU',
    match: (f) => f[0]! > 800 && f[4]! > 800,
    conditionCount: 2,
    matchedCount: (f) => [f[0]! > 800, f[4]! > 800].filter(Boolean).length,
  },
];

// ---------------------------------------------------------------------------
// Bridge state
// ---------------------------------------------------------------------------

let client: net.Socket | null = null;
let bridgeStatus: BridgeStatus = 'NOT_CONNECTED';
let activeSessionId: string | null = null;
let activeProfileId: string | null = null;
let incomingBuffer = '';

// ---------------------------------------------------------------------------
// Sensor packet parser
// ---------------------------------------------------------------------------

/**
 * Expected JSON line from glove_link.py:
 * {"flex":[v0,v1,v2,v3,v4],"accel":{"x":..,"y":..,"z":..},"gyro":{"x":..,"y":..,"z":..}}
 */
function parseSensorPacket(line: string): SensorPacket | null {
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const flex = obj['flex'] as number[] | undefined;
    const accel = obj['accel'] as { x: number; y: number; z: number } | undefined;
    const gyro = obj['gyro'] as { x: number; y: number; z: number } | undefined;
    if (!flex || flex.length < 5) return null;
    return {
      flex: [flex[0]!, flex[1]!, flex[2]!, flex[3]!, flex[4]!],
      accel: accel ?? { x: 0, y: 0, z: 0 },
      gyro: gyro ?? { x: 0, y: 0, z: 0 },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gesture classifier
// ---------------------------------------------------------------------------

/**
 * Runs all gesture rules against the flex values.
 * Returns the best-matching gesture label and its model score.
 * model_score = matchedConditions / conditionCount (0.0 – 1.0).
 */
function classifyGesture(flex: number[]): { label: string; modelScore: number } | null {
  let bestLabel: string | null = null;
  let bestScore = 0;

  for (const rule of GESTURE_RULES) {
    if (rule.match(flex)) {
      const score = rule.matchedCount(flex) / rule.conditionCount;
      if (score > bestScore) {
        bestScore = score;
        bestLabel = rule.label;
      }
    }
  }

  if (bestLabel) {
    return { label: bestLabel, modelScore: Math.round(bestScore * 100) / 100 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// POST detected gesture to the candidate API
// ---------------------------------------------------------------------------

function postCandidate(sessionId: string, profileId: string, intentLabel: string, modelScore: number): void {
  const payload = JSON.stringify({
    intent_label: intentLabel,
    model_score: modelScore,
    model_version: 'glove-threshold-v1',
    quality_passed: true,
    profile_id: profileId,
    role: 'STUDENT',
  });

  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/sessions/${sessionId}/observation`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    res.on('end', () => {
      console.log(`[GloveBridge] POST candidate ${intentLabel} (model_score=${modelScore}) → ${res.statusCode}: ${body}`);
    });
  });

  req.on('error', (err) => {
    console.error(`[GloveBridge] POST failed for ${intentLabel}:`, err.message);
  });

  req.write(payload);
  req.end();
}

// ---------------------------------------------------------------------------
// Handle incoming data from glove_link.py
// ---------------------------------------------------------------------------

function handleData(data: Buffer): void {
  incomingBuffer += data.toString();

  // Process newline-delimited JSON packets
  let newlineIdx: number;
  while ((newlineIdx = incomingBuffer.indexOf('\n')) !== -1) {
    const line = incomingBuffer.slice(0, newlineIdx).trim();
    incomingBuffer = incomingBuffer.slice(newlineIdx + 1);

    if (!line) continue;

    const packet = parseSensorPacket(line);
    if (!packet) {
      console.warn('[GloveBridge] Could not parse packet:', line.slice(0, 80));
      continue;
    }

    const gesture = classifyGesture(packet.flex);
    if (gesture && activeSessionId && activeProfileId) {
      postCandidate(activeSessionId, activeProfileId, gesture.label, gesture.modelScore);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open a TCP connection to glove_link.py on port 3333 and begin
 * reading sensor packets for the given session.
 */
export function startGloveBridge(sessionId: string, profileId: string): void {
  if (client) {
    console.warn('[GloveBridge] Already running — stopping previous bridge');
    stopGloveBridge();
  }

  activeSessionId = sessionId;
  activeProfileId = profileId;
  bridgeStatus = 'CONNECTING';
  incomingBuffer = '';

  client = new net.Socket();

  client.connect(3333, '127.0.0.1', () => {
    bridgeStatus = 'CONNECTED';
    console.log('[GloveBridge] Connected to glove_link.py on port 3333');
  });

  client.on('data', handleData);

  client.on('error', (err) => {
    bridgeStatus = 'ERROR';
    console.error('[GloveBridge] Connection error:', err.message);
    console.log('[GloveBridge] Status: NOT_CONNECTED — ensure glove_link.py is running on port 3333');
    bridgeStatus = 'NOT_CONNECTED';
  });

  client.on('close', () => {
    bridgeStatus = 'NOT_CONNECTED';
    console.log('[GloveBridge] Connection closed');
    client = null;
  });
}

/**
 * Gracefully stop the glove bridge connection.
 */
export function stopGloveBridge(): void {
  if (client) {
    client.destroy();
    client = null;
  }
  activeSessionId = null;
  activeProfileId = null;
  bridgeStatus = 'NOT_CONNECTED';
  incomingBuffer = '';
  console.log('[GloveBridge] Stopped');
}

/**
 * Returns the current connection status of the glove bridge.
 */
export function getGloveBridgeStatus(): { status: BridgeStatus; sessionId: string | null } {
  return { status: bridgeStatus, sessionId: activeSessionId };
}
