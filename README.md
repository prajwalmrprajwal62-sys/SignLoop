# SignLoop — Local Gesture Training & Communication Workstation

> **Evidence-grounded, local-first gesture communication platform.**
> Every caption is locked behind a human decision. No hallucination. No network required.

---

## What is SignLoop?

SignLoop is a full-stack local workstation for training and verifying gesture-based communication. It helps students practice gestures in a structured way, while teachers review, approve, and correct classifier outputs through an evidence-grounded pipeline.

**Key design principles:**
- 🔒 **Local-first** — all data stored in SQLite on your machine, never sent anywhere
- 🧑‍⚖️ **Human-in-the-loop** — no caption is displayed until a teacher/staff confirms it
- 🚦 **75% model-score routing gate** — gestures below threshold go to `REVIEW_REQUIRED`, never silently approved
- 📚 **RAG-grounded tutor** — answers only from approved teacher notes; abstains rather than invents
- 🔁 **Append-only audit ledger** — every event is permanent, nothing is deleted or mutated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v3.4 + Framer Motion 11 |
| UI Primitives | Radix UI + Lucide React |
| State | Zustand 5 |
| Routing | React Router v6 |
| Backend | Express.js + TypeScript |
| Database | SQLite via `better-sqlite3` + FTS5 |
| Charts | Recharts |
| Notifications | Sonner |

---

## Project Structure

```
signloop-website/
├── src/
│   ├── client/                    # React frontend
│   │   ├── pages/
│   │   │   ├── RoleSelectPage/    # Profile + context + consent selection
│   │   │   ├── LivePage/          # Real-time gesture session (GLOVE/CAMERA/SIMULATED/REPLAY)
│   │   │   ├── PracticePage/      # Guided gesture practice with RAG tutor
│   │   │   ├── TrainerPage/       # Teacher review of REVIEW_REQUIRED candidates
│   │   │   ├── CommunicationPage/ # Real-world AAC communication board
│   │   │   └── ProfilePage/       # Privacy controls, data export, consent
│   │   ├── components/
│   │   │   ├── common/            # StatusBadge, GlassCard, MonoLabel, etc.
│   │   │   └── tutor/             # TutorPanel, TutorResponse, AbstentionCard
│   │   ├── layout/                # AppShell, TopBar, PrimaryNav
│   │   ├── stores/                # Zustand: profileStore, sessionStore, liveStore
│   │   └── api/                   # apiGet/apiPost client + React hooks
│   ├── server/                    # Express.js backend
│   │   ├── db/
│   │   │   ├── migrations/        # 17 SQL migrations (001–015 + 004b + 012a)
│   │   │   ├── connection.ts      # Singleton DB with WAL mode + FK enforcement
│   │   │   ├── migrate.ts         # Migration runner (also supports --reset)
│   │   │   └── seed.ts            # Seeds 4 profiles, knowledge sources, practice tasks
│   │   ├── services/              # 11 domain services
│   │   │   ├── EventService.ts    # ONLY writer to append-only events ledger
│   │   │   ├── RoutingService.ts  # 75% model-score routing gate
│   │   │   ├── DecisionService.ts # Human decisions → approved outputs
│   │   │   ├── RetrievalService.ts # FTS5 RAG retrieval (3 source classes only)
│   │   │   ├── GroundingValidator.ts # Abstains if insufficient evidence
│   │   │   └── ...                # QualityService, PracticeService, etc.
│   │   ├── routes/                # 9 Express routers (profiles, sessions, candidates, etc.)
│   │   └── adapters/              # Hardware adapters (GLOVE, CAMERA, SIMULATED, REPLAY)
│   └── shared/types/              # TypeScript domain types (12 files)
├── data/
│   ├── phrase-registry.json       # 12 gesture intents with captions + audio paths
│   └── fixtures/                  # 7 deterministic replay fixtures (A–G)
├── scripts/
│   ├── audit-claims.ts            # Compliance checker — 14 prohibited phrases
│   ├── verify-m1.ts               # Database integrity verifier
│   └── verify-demo.ts             # End-to-end demo path verifier
└── tests/
    └── unit/adversarial_db.test.ts # Append-only enforcement tests
```

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (first time only)
npm run db:reset
npm run db:seed

# 3. Start the backend (port 3001)
npm run server

# 4. Start the frontend in a new terminal (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Database Commands

```bash
# Apply all migrations
npm run db:migrate

# Reset database and re-apply all migrations
npm run db:reset

# Seed with sample profiles, knowledge sources, practice tasks
npm run db:seed
```

---

## Compliance & Verification

```bash
# Check for 14 prohibited phrases across all source files
npm run audit:claims

# TypeScript type check (zero errors required)
npm run typecheck

# Production build
npm run build
```

The audit enforces absence of: `full translator`, `universal sign language`, `75% accurate`, `75% confident`, `zero hallucinations`, `learning proven`, `heard and understood`, `usually talks about`, `works for everyone`, `certified`, `production-ready`, `learned the person`, `accuracy` (as gate label), `confidence` (as gate label).

---

## The 9-Step Demo Path

| Step | Action | Expected result |
|---|---|---|
| 1 | Open http://localhost:5173 | Role selection screen with 4 profile cards |
| 2 | Select **STU-01 · STUDENT** | Context + consent screen appears |
| 3 | Choose **LEARNING_PRACTICE** → consent → Continue | Live session page loads |
| 4 | Select **SIMULATED** source, click **Start Session** | Session started, source badge shows SIMULATED |
| 5 | Click **Run Quality Check** | 4 checks shown as PASS (SIMULATED auto-passes) |
| 6 | Select **HELP** intent, score **0.82**, click **Emit Observation** | Candidate panel appears with CANDIDATE_READY badge |
| 7 | Click **CONFIRM** | Caption "I need help." displayed, CONFIRMED badge |
| 8 | Switch to **REPLAY** mode, select **Fixture B** | Score 68% shown — REVIEW_REQUIRED ("below the 75% model-score routing gate") |
| 9 | Go to **Practice** page | Task card shown, TutorPanel has 4 query buttons (no text input) |

---

## Architecture Invariants

These rules are enforced in code and must never be violated:

1. **Append-only events** — `EventService.ts` is the ONLY writer. No UPDATE/DELETE on `events` table (SQLite trigger prevents it).
2. **75% routing gate** — always referred to as "model-score routing gate". Never "accuracy gate" or "confidence gate".
3. **Candidate suppression** — `CandidatePanel` only renders when `qualityGate.overall === 'PASS'`. `RoutingService` throws if quality failed.
4. **Approved output gate** — caption text is locked until a `HUMAN_DECISION_RECORDED` event exists. `approved_outputs` only created on CONFIRM or CORRECT.
5. **RAG source classes** — ONLY `TEACHER_KNOWLEDGE`, `STUDENT_EVIDENCE`, `APPROVED_TRAINING`. No others.
6. **Tutor panel** — 4 buttons only (WHY_TASK, WHAT_NEXT, PROGRESS, SHOW_REFERENCE). No free-text chat input.
7. **Status labels** — 26 canonical labels only. Always rendered as icon + colour + text, never colour-only.
8. **Score field** — `score` in candidates table is `NULL` when unmeasured. NEVER stored as `0`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profiles` | List all active profiles |
| POST | `/api/profiles` | Create profile |
| POST | `/api/profiles/:id/select` | Select profile (returns contexts) |
| POST | `/api/sessions` | Start session |
| POST | `/api/sessions/:id/end` | End session |
| GET | `/api/sessions/:id/timeline` | Event timeline |
| POST | `/api/sessions/:id/quality/check` | Run quality gate |
| POST | `/api/sessions/:id/observation` | Emit candidate via routing |
| GET | `/api/sessions/:id/candidates` | List session candidates |
| POST | `/api/candidates/:id/confirm` | Confirm candidate |
| POST | `/api/candidates/:id/correct` | Correct intent |
| POST | `/api/candidates/:id/reject` | Reject candidate |
| POST | `/api/candidates/:id/repeat` | Request repeat |
| GET | `/api/candidates/:id/evidence` | Evidence sources |
| GET | `/api/candidates/:id/decisions` | Decision history |
| GET | `/api/practice/tasks` | Practice tasks for profile |
| GET | `/api/practice/followups` | Follow-up comparison cases |
| POST | `/api/retrieval/run` | Run RAG retrieval |
| POST | `/api/tutor/respond` | Generate grounded tutor response |
| GET | `/api/knowledge/sources` | Knowledge sources |
| POST | `/api/knowledge/sources` | Add knowledge source |
| POST | `/api/knowledge/sources/:id/approve` | Approve (DRAFT → APPROVED) |
| POST | `/api/knowledge/sources/:id/supersede` | Supersede (creates new version) |
| POST | `/api/knowledge/sources/:id/revoke` | Revoke source |
| GET | `/api/fixtures` | List all fixtures |
| POST | `/api/fixtures/:id/run` | Run fixture (deterministic state) |
| GET | `/api/privacy/status/:profileId` | Consent + profile status |
| GET | `/api/privacy/export/:profileId` | Export all profile data as JSON |
| POST | `/api/privacy/delete/:profileId` | Soft-delete profile |
| POST | `/api/privacy/revoke/:profileId` | Revoke all consents |
| POST | `/api/audio/request` | Request audio playback |
| GET | `/api/health` | Server health check |

---

## Fixtures (Deterministic Replay)

| ID | Fixture | Scenario |
|---|---|---|
| `fixture-a-success-confirm` | A: Success Confirm | HELP gesture, score 82%, CANDIDATE_READY → CONFIRM |
| `fixture-b-review-below-gate` | B: Review Below Gate | WATER gesture, score 68%, REVIEW_REQUIRED — "below the 75% model-score routing gate" |
| `fixture-c-invalid-input` | C: Invalid Input | Quality check fails → SIGNAL_INVALID, no candidate emitted |
| `fixture-d-rag-grounded` | D: RAG Grounded | WHY_TASK query → GROUNDED response from TEACHER_KNOWLEDGE sources |
| `fixture-e-rag-abstain` | E: RAG Abstain | Unsupported query → INSUFFICIENT_EVIDENCE abstention |
| `fixture-f-rag-conflict` | F: RAG Conflict | Conflicting teacher notes → SOURCES_CONFLICT |
| `fixture-g-teach-mode` | G: Teach Mode | REPEAT candidate, teacher confirms |

---

## Privacy & Data

- **All data is local** — stored in `data/signloop.db` (SQLite). Never transmitted.
- **Consent-gated retrieval** — RAG retrieval blocked if consent is not `GRANTED`
- **Student isolation** — `STUDENT_EVIDENCE` sources are only retrievable by the student who generated them
- **Soft delete** — profile deletion marks `visibility_status = 'DELETED'`; raw events retained per retention class
- **Export** — `GET /api/privacy/export/:profileId` returns full JSON dump

---

## License

MIT — Built for hackathon demonstration purposes.
