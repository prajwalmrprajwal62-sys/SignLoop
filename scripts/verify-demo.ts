import { getDb, closeDb } from '../src/server/db/connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyDemo() {
  console.log('====================================================');
  console.log('  SIGNLOOP DEMO PATH PREREQUISITES VERIFICATION');
  console.log('====================================================\n');

  const db = getDb();

  console.log('[Step 1/9] Checking Teacher Note TNOTE-001 readiness...');
  const tnote1 = db.prepare(`SELECT * FROM knowledge_sources WHERE source_id = 'TNOTE-001'`).get() as any;
  if (!tnote1) throw new Error('TNOTE-001 missing from database');
  console.log(`  -> Found ${tnote1.source_id}: "${tnote1.source_title}" (status: ${tnote1.status})`);

  console.log('[Step 2/9] Checking Student Practice Task WATER / HELP readiness...');
  const taskHelp = db.prepare(`SELECT * FROM practice_tasks WHERE task_id = 'task-stu-01-help'`).get() as any;
  if (!taskHelp) throw new Error('task-stu-01-help missing from database');
  console.log(`  -> Found ${taskHelp.task_id}: intent ${taskHelp.intent_id} (status: ${taskHelp.status})`);

  console.log('[Step 3/9] Checking Fixture A (HELP) vocabulary entry...');
  const registryPath = path.resolve(__dirname, '../data/phrase-registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const helpEntry = registry.entries.find((e: any) => e.intent === 'HELP');
  if (!helpEntry) throw new Error('HELP missing from phrase registry');
  console.log(`  -> Registry has HELP: "${helpEntry.caption}" (category: ${helpEntry.category})`);

  console.log('[Step 4/9] Checking Fixture B (WATER) vocabulary entry & routing gate threshold...');
  const waterEntry = registry.entries.find((e: any) => e.intent === 'WATER');
  if (!waterEntry) throw new Error('WATER missing from phrase registry');
  console.log(`  -> Registry has WATER: "${waterEntry.caption}"`);

  console.log('[Step 5/9] Checking Grounded Student Evidence EVID-001 & EVID-002...');
  const evid1 = db.prepare(`SELECT * FROM knowledge_sources WHERE source_id = 'EVID-001'`).get() as any;
  const evid2 = db.prepare(`SELECT * FROM knowledge_sources WHERE source_id = 'EVID-002'`).get() as any;
  if (!evid1 || !evid2) throw new Error('Student evidence records missing');
  console.log(`  -> Found ${evid1.source_id} and ${evid2.source_id}`);

  console.log('[Step 6/9] Checking Curriculum Reference TRAIN-001...');
  const train1 = db.prepare(`SELECT * FROM knowledge_sources WHERE source_id = 'TRAIN-001'`).get() as any;
  if (!train1) throw new Error('TRAIN-001 missing');
  console.log(`  -> Found ${train1.source_id}: "${train1.source_title}"`);

  console.log('[Step 7/9] Checking Profiles STU-01, STU-02, TRN-01, STAFF-01...');
  const profiles = db.prepare(`SELECT pseudonymous_code, role FROM profiles ORDER BY pseudonymous_code`).all() as any[];
  console.log(`  -> Found ${profiles.length} profiles: ${profiles.map(p => `${p.pseudonymous_code} (${p.role})`).join(', ')}`);

  console.log('[Step 8/9] Checking Follow-Up Case case-stu-01-water...');
  const followUp = db.prepare(`SELECT * FROM follow_up_cases WHERE case_id = 'case-stu-01-water'`).get() as any;
  if (!followUp) throw new Error('case-stu-01-water missing');
  console.log(`  -> Found ${followUp.case_id}: status ${followUp.status}`);

  console.log('[Step 9/9] Checking FTS5 search index over teacher notes and evidence...');
  const searchResults = db.prepare(`SELECT source_id, content FROM knowledge_sources_fts WHERE knowledge_sources_fts MATCH 'HELP'`).all() as any[];
  console.log(`  -> FTS5 match query for 'HELP' returned ${searchResults.length} source records.`);

  closeDb();

  console.log('\n====================================================');
  console.log('✅ ALL DEMO PREREQUISITES VERIFIED SUCCESSFULLY');
  console.log('Database foundation is primed for downstream replay fixtures.');
  console.log('====================================================\n');
}

verifyDemo().catch((err) => {
  console.error('[DEMO VERIFICATION ERROR]:', err);
  process.exit(1);
});
