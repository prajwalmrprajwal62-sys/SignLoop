// ReplayAdapter.ts — wraps ReplayService for HTTP use
import { ReplayService } from '../services/ReplayService';

export class ReplayAdapter {
  static listFixtures() {
    return ReplayService.getAll();
  }

  static getFixture(id: string) {
    const fixture = ReplayService.getById(id);
    if (!fixture) return null;
    return fixture;
  }

  static runFixture(id: string) {
    return ReplayService.run(id);
  }
}
