-- 008_approved_outputs.sql: Locked until human decision, then releases caption
CREATE TABLE IF NOT EXISTS approved_outputs (
  output_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES human_decisions(decision_id),
  final_intent TEXT NOT NULL,
  phrase_key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en-IN',
  caption_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approved_outputs_decision_id ON approved_outputs(decision_id);
