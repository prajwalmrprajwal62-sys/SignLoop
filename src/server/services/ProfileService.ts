// ProfileService.ts — Profiles + contexts, NO cross-profile data access
import { getDb } from '../db/connection';
import type { Profile, ProfileContext } from '../../shared/types/profiles';

export class ProfileService {
  static getAll(): Profile[] {
    return getDb().prepare("SELECT * FROM profiles WHERE visibility_status = 'ACTIVE'").all() as Profile[];
  }

  static getById(id: string): Profile | undefined {
    return getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Profile | undefined;
  }

  static create(data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Profile {
    const db = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO profiles (id, pseudonymous_code, role, preferred_locale, visibility_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.pseudonymous_code, data.role, data.preferred_locale, data.visibility_status, now, now);
    return this.getById(id)!;
  }

  static getContextsForProfile(profileId: string): ProfileContext[] {
    return getDb().prepare('SELECT * FROM profile_contexts WHERE profile_id = ? AND active = 1').all(profileId) as ProfileContext[];
  }

  static getActiveContext(profileId: string, contextType: string): ProfileContext | undefined {
    return getDb().prepare(
      "SELECT * FROM profile_contexts WHERE profile_id = ? AND context_type = ? AND active = 1 AND consent_status = 'GRANTED'"
    ).get(profileId, contextType) as ProfileContext | undefined;
  }
}
