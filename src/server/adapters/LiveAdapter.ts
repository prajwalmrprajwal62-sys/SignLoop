// LiveAdapter.ts — Live glove interface, NOT_CONNECTED until hardware connected
export interface LiveGloveStatus {
  connected: boolean;
  tcpHost: string;
  tcpPort: number;
  statusCode: 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR';
  message: string;
}

export class LiveAdapter {
  static getStatus(): LiveGloveStatus {
    return {
      connected: false,
      tcpHost: 'localhost',
      tcpPort: 3333,
      statusCode: 'NOT_CONNECTED',
      message: 'SignLoop glove not detected on TCP port 3333. Ensure glove is powered on and paired.',
    };
  }
}
