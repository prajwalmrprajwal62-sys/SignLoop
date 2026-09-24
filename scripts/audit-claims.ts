import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  phrase: string;
  snippet: string;
}

const LITERAL_PROHIBITED = [
  'full translator',
  'universal sign language',
  '75% accurate',
  '75% confident',
  'zero hallucinations',
  'learning proven',
  'heard and understood',
  'usually talks about',
  'works for everyone',
  'certified',
  'production-ready',
  'learned the person'
];

const GATE_PROHIBITED_REGEXES = [
  { name: 'accuracy (as label for 75% gate)', regex: /\b75%\s*accuracy\b/i },
  { name: 'confidence (as label for 75% gate)', regex: /\b75%\s*confidence\b/i },
  { name: 'accuracy (as label for 75% gate)', regex: /\baccuracy\s*(gate|threshold|routing|route)\b/i },
  { name: 'confidence (as label for 75% gate)', regex: /\bconfidence\s*(gate|threshold|routing|route)\b/i },
  { name: 'accuracy (as label for 75% gate)', regex: /\b(gate|threshold|routing|route)\s*accuracy\b/i },
  { name: 'confidence (as label for 75% gate)', regex: /\b(gate|threshold|routing|route)\s*confidence\b/i },
  { name: 'accuracy (as label for 75% gate)', regex: /\bmodel-score\s*accuracy\b/i },
  { name: 'confidence (as label for 75% gate)', regex: /\bmodel-score\s*confidence\b/i },
];

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === '.agents' ||
        entry.name === '.tmp'
      ) {
        continue;
      }
      scanDirectory(fullPath, fileList);
    } else if (entry.isFile()) {
      if (/\.(ts|tsx|json)$/.test(entry.name)) {
        // Exclude the audit script itself so its pattern list does not self-trigger
        if (entry.name === 'audit-claims.ts') {
          continue;
        }
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

export function runClaimsAudit(projectRoot = process.cwd()): Violation[] {
  const targetDirs = [
    path.join(projectRoot, 'src'),
    path.join(projectRoot, 'data'),
    path.join(projectRoot, 'scripts'),
    path.join(projectRoot, 'tests')
  ];

  const filesToScan: string[] = [];
  for (const dir of targetDirs) {
    scanDirectory(dir, filesToScan);
  }

  const violations: Violation[] = [];

  for (const filePath of filesToScan) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNum = i + 1;

      // Check literal prohibited phrases (case-insensitive)
      for (const phrase of LITERAL_PROHIBITED) {
        if (line.toLowerCase().includes(phrase.toLowerCase())) {
          violations.push({
            file: path.relative(projectRoot, filePath),
            line: lineNum,
            phrase,
            snippet: line.trim()
          });
        }
      }

      // Check regex prohibited patterns (e.g. accuracy/confidence used for routing gate)
      for (const pattern of GATE_PROHIBITED_REGEXES) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: path.relative(projectRoot, filePath),
            line: lineNum,
            phrase: pattern.name,
            snippet: line.trim()
          });
        }
      }
    }
  }

  return violations;
}

// CLI execution handling
const violations = runClaimsAudit();

console.log('====================================================');
console.log('  SIGNLOOP CLAIMS & COMPLIANCE AUDIT');
console.log('====================================================\n');

if (violations.length === 0) {
  console.log('✅ AUDIT PASSED: Zero prohibited phrases detected across all scanned files.');
  console.log('Scanned file types: .ts, .tsx, .json');
  console.log('Prohibited claims verified absent: 14/14');
  console.log('\n====================================================');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED: ${violations.length} prohibited phrase violation(s) found:\n`);
  for (const v of violations) {
    console.error(`- [${v.phrase}] in ${v.file}:${v.line}`);
    console.error(`    "${v.snippet}"\n`);
  }
  console.error('====================================================');
  process.exit(1);
}
