// CameraAdapter.ts — MediaPipe stub, always NOT_CONNECTED initially
export interface CameraStatus {
  connected: boolean;
  deviceLabel: string | null;
  frameRate: number | null;
  handsDetected: number | null;
  statusCode: 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR';
  message: string;
}

export class CameraAdapter {
  static getStatus(): CameraStatus {
    // MediaPipe camera is always stubbed as NOT_CONNECTED in server context
    return {
      connected: false,
      deviceLabel: null,
      frameRate: null,
      handsDetected: null,
      statusCode: 'NOT_CONNECTED',
      message: 'Camera access requires browser context with MediaPipe. Use SIMULATED or REPLAY source.',
    };
  }
}
