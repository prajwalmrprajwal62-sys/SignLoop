export const Role = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const ContextType = {
  LEARNING_PRACTICE: 'LEARNING_PRACTICE',
  REAL_WORLD_INTERACTION: 'REAL_WORLD_INTERACTION',
} as const;
export type ContextType = typeof ContextType[keyof typeof ContextType];

export const ConsentStatus = {
  GRANTED: 'GRANTED',
  REVOKED: 'REVOKED',
  PENDING: 'PENDING',
} as const;
export type ConsentStatus = typeof ConsentStatus[keyof typeof ConsentStatus];

export interface Profile {
  id: string;
  pseudonymous_code: string;
  role: Role;
  preferred_locale: string;
  visibility_status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  created_at: string;
  updated_at: string;
}

export interface ProfileContext {
  id: string;
  profile_id: string;
  context_type: ContextType;
  consent_status: ConsentStatus;
  output_modality: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
