# LiveKit Agent Migration Plan

Plan to extract `livekit-agent` from `orion-talentiq` into a separate Git repository while ensuring both projects continue to work correctly.

---

## 1. Dependency Analysis

### 1.1 What the main project (orion-talentiq) uses

| File | Purpose |
|------|---------|
| `lib/interview-constants.ts` | `READ_QUESTION_PREFIX`, `SUBMIT_ANSWER_PREFIX` |
| `lib/interview-turn-contract.ts` | `INTERVIEW_CONTROL_TOPIC`, `SUBMIT_ANSWER_PREFIX`, `parseAgentControlEvent`, `AgentControlEvent`, `TurnState` |
| `lib/livekit-voice.service.ts` | Imports from both above; connects to LiveKit, sends questions, receives agent events |
| `app/api/interview/[token]/live/livekit-token/route.ts` | Mints tokens with `RoomAgentDispatch` for `agentName: "interview-agent"` |

**No imports from `livekit-agent` folder.** The main project never imports agent code. Communication is via LiveKit (room, chat, data packets).

### 1.2 What livekit-agent uses

| File | Purpose |
|------|---------|
| `livekit-agent/interview-constants.ts` | `READ_QUESTION_PREFIX`, `SUBMIT_ANSWER_PREFIX`, `INTERVIEW_CONTROL_TOPIC` |
| `livekit-agent/main.ts` | Imports from `./interview-constants.js`; defines the voice agent |

**No imports from orion-talentiq.** The agent is self-contained. It connects to LiveKit and receives dispatch jobs when participants join.

### 1.3 Shared contract (must stay in sync)

Both projects rely on the same protocol values. If they diverge, the interview flow breaks.

| Constant | Value | Used by |
|----------|-------|---------|
| `READ_QUESTION_PREFIX` | `"Please read this interview question aloud exactly as written: "` | Client (send), Agent (receive) |
| `SUBMIT_ANSWER_PREFIX` | `"SUBMIT_ANSWER:"` | Client (send), Agent (receive) |
| `INTERVIEW_CONTROL_TOPIC` | `"interview-control"` | Both (DataPacket topic) |
| `agentName` | `"interview-agent"` | Token API (dispatch), Agent (WorkerOptions) |
| `AgentControlEvent` types | `agent_speaking_started`, `agent_speaking_finished`, `user_turn_open`, `agent_ready` | Client (parse), Agent (emit) |

---

## 2. Changes Required

### 2.1 In orion-talentiq (after livekit-agent is moved out)

| Task | File | Action |
|------|------|--------|
| 1 | `livekit-agent/` | Delete entire folder (or remove from repo after copying to new repo) |
| 2 | `tsconfig.json` | Remove `"livekit-agent"` from `exclude` array |
| 3 | `.gitignore` | Remove `livekit-agent/node_modules` line |

**No import path changes.** The main project does not import from livekit-agent.

### 2.2 In livekit-agent (new standalone repo)

| Task | File | Action |
|------|------|--------|
| 1 | Root | Create new Git repo; copy `livekit-agent/` contents as repo root |
| 2 | `interview-constants.ts` | Keep as-is; update comment to reference orion-talentiq contract location |
| 3 | `main.ts` | No changes; imports `./interview-constants.js` (relative, still valid) |
| 4 | `package.json` | No changes; already self-contained |
| 5 | `tsconfig.json` | Update `include` to `["main.ts", "interview-constants.ts"]` for clarity (optional) |
| 6 | `.env.local` | Create `.env.example` documenting required env vars |

### 2.3 Dotenv path in livekit-agent

Current code:

```ts
dotenv.config({ path: ".env.local" });
```

This loads from the **current working directory** when the process runs. After the move, run the agent from its repo root (e.g. `npm run start`), so it will load `./.env.local` in the new repo. **No code change needed.**

---

## 3. Shared Contract Strategy

You have two options to keep the contract in sync.

### Option A: Shared npm package (recommended long-term)

1. Create a package `@orion/interview-contract` (or similar) with:
   - `READ_QUESTION_PREFIX`
   - `SUBMIT_ANSWER_PREFIX`
   - `INTERVIEW_CONTROL_TOPIC`
   - `AgentControlEvent` type and `parseAgentControlEvent` (if agent needs it)
2. Publish to npm (private or public) or use a monorepo workspace.
3. Both orion-talentiq and livekit-agent add it as a dependency.
4. Remove duplicate constants from both projects.

### Option B: Documented duplication (simpler short-term)

1. Keep constants in both repos.
2. Add a `CONTRACT.md` in livekit-agent that:
   - Lists all shared values
   - Links to orion-talentiq source: `lib/interview-constants.ts`, `lib/interview-turn-contract.ts`
   - States: "When changing these, update both repos."
3. Add a pre-commit or CI check (optional) that compares values.

---

## 4. Environment Variables

### livekit-agent needs (in `.env.local` or deployment env)

| Variable | Purpose |
|----------|---------|
| `LIVEKIT_URL` | LiveKit server URL (same as orion-talentiq) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `GOOGLE_GEMINI_API_KEY` | Gemini Live API (for voice model) |

These must match the LiveKit config used by orion-talentiq's token API so the agent connects to the same LiveKit server.

---

## 5. Agent name and token API

The token API hardcodes:

```ts
const AGENT_NAME = "interview-agent";
```

The agent registers with:

```ts
agentName: "interview-agent",
```

**Both must stay `"interview-agent"`.** No changes needed after migration.

---

## 6. Step-by-step migration checklist

### Phase 1: Prepare livekit-agent repo ✅

- [x] Create new Git repository (e.g. `orion-interview-agent` or `livekit-agent`)
- [x] Standalone agent created at `d:\projects\ORION\livekit-agent\` — copy to your new repo when ready
- [x] Copy these files from `orion-talentiq/livekit-agent/` to the new repo root:
  - `main.ts`
  - `interview-constants.ts`
  - `package.json`
  - `tsconfig.json`
- [x] Add `.env.example` with `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `GOOGLE_GEMINI_API_KEY`
- [x] Add `README.md` with setup, env vars, and contract sync notes
- [x] Add `CONTRACT.md` (Option B) documenting shared values
- [x] Update `interview-constants.ts` comment to: `Must match orion-talentiq lib/interview-constants.ts and lib/interview-turn-contract.ts`
- [x] Run `npm install` and `npm run build` in the new repo
- [ ] Test agent locally: `npm run start` or `npm run dev` (requires `.env.local` with LIVEKIT_* and GOOGLE_GEMINI_API_KEY)

### Phase 2: Update orion-talentiq ✅

- [x] Remove `livekit-agent` from `tsconfig.json` exclude
- [x] Remove `livekit-agent/node_modules` from `.gitignore`
- [x] Delete `livekit-agent/` folder (or stop tracking it)
- [x] Run `npm run build` to confirm main project still builds
- [x] Run tests: `npm run test`

### Phase 3: Verify integration

- [ ] Deploy livekit-agent to Railway/Render/Fly.io (or your chosen platform)
- [ ] Ensure LIVEKIT_* and GOOGLE_GEMINI_API_KEY are set in deployment
- [ ] Deploy orion-talentiq to Vercel (unchanged)
- [ ] Run a full interview flow: candidate joins → agent speaks → candidate answers → submit

---

## 7. File structure after migration

### orion-talentiq (unchanged structure, minus livekit-agent)

```
orion-talentiq/
├── app/
├── lib/
│   ├── interview-constants.ts      ← Keep
│   ├── interview-turn-contract.ts  ← Keep
│   └── livekit-voice.service.ts    ← No changes
├── package.json
├── tsconfig.json
└── ...
```

### livekit-agent (new repo)

```
livekit-agent/   (or orion-interview-agent/)
├── main.ts
├── interview-constants.ts   ← Must stay in sync with orion-talentiq
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 8. Summary

| Concern | Resolution |
|---------|-------------|
| Import paths | No cross-project imports; both use relative/local paths |
| Shared constants | Keep in sync via Option A (npm package) or Option B (documented duplication) |
| Env vars | Agent loads `.env.local` from its own root; document required vars |
| Agent name | Both use `"interview-agent"`; no change |
| Token API | No changes; still dispatches to same agent name |
| Main project build | Remove tsconfig exclude and gitignore entry; delete folder |
