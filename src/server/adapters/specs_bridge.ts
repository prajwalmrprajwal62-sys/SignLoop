/**
 * specs_bridge.ts — AR specs camera input adapter (stub)
 *
 * When fully implemented, this adapter connects to the AR specs' camera feed
 * and runs real-time gesture recognition via MediaPipe hand/pose landmarks.
 * Detected gestures are POSTed to the same candidate API used by the glove bridge.
 *
 * Current status: STUB — always reports NOT_CONNECTED.
 */

export type SpecsBridgeStatus = 'CONNECTED' | 'NOT_CONNECTED';

let specsStatus: SpecsBridgeStatus = 'NOT_CONNECTED';

/**
 * Start the AR specs camera bridge.
 * TODO: Implement WebSocket/RTSP connection to specs camera feed,
 *       pipe frames through MediaPipe hand landmark model,
 *       classify gestures, and POST candidates to the API.
 */
export function startSpecsBridge(): void {
  console.log('[SpecsBridge] Specs bridge is a stub — NOT_CONNECTED');
  console.log('[SpecsBridge] To implement: connect to camera feed for real-time gesture recognition via MediaPipe');
  specsStatus = 'NOT_CONNECTED';
}

/**
 * Stop the AR specs camera bridge.
 */
export function stopSpecsBridge(): void {
  console.log('[SpecsBridge] Stopped (stub)');
  specsStatus = 'NOT_CONNECTED';
}

/**
 * Returns the current connection status of the specs bridge.
 */
export function getSpecsBridgeStatus(): { status: SpecsBridgeStatus } {
  return { status: specsStatus };
}
