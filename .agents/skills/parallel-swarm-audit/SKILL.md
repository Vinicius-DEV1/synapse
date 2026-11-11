---
name: parallel-swarm-audit
description: >-
  Orchestrates an automated multi-agent parallel swarm audit across isolated
  architectural blocks (3-Agent or 4-Agent Dual-Account 2x2 topology) using
  Git Worktrees, strict boundary isolation, and automated multi-way merge
  integration.
---

# Parallel Swarm Audit — Multi-Agent Quality Orchestrator

> Activate when the user requests a **swarm audit**, **parallel multi-agent audit**,
> or **accelerated whole-app deep review**. This skill enables a Lead Orchestrator
> to partition the codebase into orthogonal blocks, prepare isolated Git Worktrees,
> delegate work to parallel worker agents, and merge results with automated verification.

---

## 1. Topologies

### Option A: 3-Agent Topology (Single Account)

| Agent | Branch | Perimeter |
| :---- | :----- | :-------- |
| **Alpha** (Core & Security) | `audit/agent-1-core` | Backend Rust, Tauri IPC, Cryptography, Storage, Cloud Sync |
| **Beta** (Editor & Media) | `audit/agent-2-editor` | TipTap/ProseMirror, Extensions, Canvas, Video/Audio, FSRS |
| **Gamma** (Shell & Collab) | `audit/agent-3-app` | App Shell, Zustand Store, Productivity Modules, E2EE Sharing |

### Option B: 4-Agent Quad-Swarm (Dual-Account 2×2)

Leverages two simultaneous IDE instances to double rate limits:

```
┌───────────────────────────────────────────────────┐
│                  Git Repository                     │
│           (/path/to/caderno [master])              │
└───────────────────┬───────────────────────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
  Account 1 (Profile 1)  Account 2 (Profile 2)
 ┌────────────────────┐  ┌────────────────────┐
 │ Worker 1: Core     │  │ Worker 3: Media    │
 │ Worker 2: Editor   │  │ Worker 4: Shell    │
 └────────────────────┘  └────────────────────┘
```

| Agent | Branch | Architectural Perimeter |
| :---- | :----- | :---------------------- |
| **Agent 1** | `audit/agent-1-core` | `apps/web-react/src-tauri/`, `apps/web-react/src/api/`, `apps/web-react/src/services/storage/`, `apps/web-react/src/services/crypto.ts`, `apps/web-react/src/services/vault-crypto.ts`, `apps/web-react/src/services/drive/`, `apps/web-react/src/services/sync/`, `apps/web-react/src/components/vault/`, `apps/web-react/src/components/auth/` |
| **Agent 2** | `audit/agent-2-editor` | `apps/web-react/src/components/Editor.tsx`, `apps/web-react/src/components/editor/`, `apps/web-react/src/components/editor-extensions/`, `apps/web-react/src/components/page-view/` |
| **Agent 3** | `audit/agent-3-media-study` | `apps/web-react/src/components/video-player/`, `apps/web-react/src/services/video/`, `apps/web-react/src/components/diagrams/`, `apps/web-react/src/components/files/`, `apps/web-react/src/components/library/`, `apps/web-react/src/components/anki/`, `apps/web-react/src/services/fsrs.ts`, `apps/web-react/src/services/quiz/`, `apps/web-react/src/services/lofi-manager.ts`, `apps/web-react/src/services/image-gc.ts`, `apps/web-react/src/services/image-drive.ts`, `apps/web-react/src/services/youtube/` |
| **Agent 4** | `audit/agent-4-app-collab` | `apps/web-react/src/App.tsx`, `apps/web-react/src/main.tsx`, `apps/web-react/src/share-viewer/`, `apps/web-react/src/components/layout/`, `apps/web-react/src/components/ui/`, `apps/web-react/src/components/home/`, `apps/web-react/src/components/AiSidebar.tsx`, `apps/web-react/src/components/sharing/`, `apps/web-react/src/services/sharing/`, `apps/web-react/src/components/finance/`, `apps/web-react/src/components/calendar/`, `apps/web-react/src/components/culture/`, `apps/web-react/src/components/focus/`, `apps/web-react/src/store/`, `apps/web-react/src/hooks/` |

---

## 2. Guardrails

> [!CAUTION]
> 1. **Zero Scope Creep** — Workers must NEVER modify files outside their block.
> 2. **100% Functional & Visual Parity** — No existing behavior or UI may break.
> 3. **Zero `any`** — Strict TypeScript enforcement.
> 4. **Fast Targeted Feedback** — `npm run test -- <path>` + `npm run typecheck`.
> 5. **Atomic Conventional Commits** — English only (`fix(...)`, `perf(...)`, etc.).
> 6. **Zero Audit Artifact Pollution** — Reports, prompts, and worktrees are never committed.

---

## 3. Automation Lifecycle

### Phase 1: Worktree Setup

```bash
# Create isolated git worktrees with symlinked node_modules:
npm run swarm:setup
# Or directly:
bash .agents/skills/parallel-swarm-audit/scripts/setup.sh [base_branch] [3|quad]
```

### Phase 2: Worker Dispatch

Workers receive role prompts from `docs/audit/`:
- Agent 1: `docs/audit/agent_1_core.md`
- Agent 2: `docs/audit/agent_2_editor.md`
- Agent 3: `docs/audit/agent_3_media_study.md`
- Agent 4: `docs/audit/agent_4_app_collab.md`

### Phase 3: Multi-Way Merge & Reconciliation

```bash
npm run swarm:merge
# Or directly:
bash .agents/skills/parallel-swarm-audit/scripts/merge.sh [base_branch]
```

The merge script:
1. Merges all active audit branches sequentially into the base branch.
2. Validates TypeScript cross-contracts (`npm run typecheck`).
3. Runs targeted Vitest regression tests.
4. Cleans up temporary worktrees.
