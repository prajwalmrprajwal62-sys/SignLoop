// quality.ts — aligned with actual DB schema (005_quality_checks.sql)
// DB columns: gate_id, session_id, policy_version, status, primary_reason_code, checks_json, evaluated_at

export interface QualityCheck {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  observed_value: string | null;
  threshold_or_rule: string | null;
  repair_hint: string | null;
}

export interface QualityGateRecord {
  gate_id: string;
  session_id: string;
  policy_version: string;
  status: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  primary_reason_code: string | null;
  checks_json: string; // JSON array of QualityCheck
  evaluated_at: string;
}

export interface QualityGateResult {
  overall: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  checks: QualityCheck[];
  failed_check: QualityCheck | null;
  candidate_allowed: boolean;
}
