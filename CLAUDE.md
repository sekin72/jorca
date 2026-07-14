# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Orca is an Electron desktop app (plus a companion mobile app and an `orca` CLI) for orchestrating multiple coding agents in parallel across isolated git worktrees, locally or over SSH. The coding conventions above (design system, cross-platform, SSH, git-binary/provider compatibility, file naming) are enforced — read them before writing code.

## Commands

Package manager is **pnpm** (v10, Node 24). There is no npm/yarn.

```bash
pnpm install            # also runs postinstall → rebuild-native-deps (node-pty, sherpa-onnx, @parcel/watcher)
pnpm dev                # run the Electron app in dev (electron-vite)
pnpm dev:web            # run the renderer alone in a browser (vite, web target)

pnpm lint               # oxlint + switch-exhaustiveness + styled-scrollbar + reliability-gates + max-lines-ratchet + localization checks
pnpm typecheck          # tsc across all three project realms (node, cli, web) — see below
pnpm test               # vitest (unit/integration), runs under Node runtime
pnpm build              # full desktop + native build

pnpm test:e2e           # Playwright against a headless Electron build (tests/playwright.config.ts)
```

Run **`pnpm lint && pnpm typecheck && pnpm test && pnpm build`** before opening a PR — this is exactly what CI runs.

### Running a single test

`pnpm test` forwards args to vitest, so pass a path or name filter:

```bash
pnpm test src/shared/agent-detection.test.ts   # one file
pnpm test agent-detection                       # by filename substring
pnpm test -t "resolves the shell path"          # by test name
```

Unit tests are colocated with source as `*.test.ts` / `*.test.tsx`; E2E specs live in `tests/e2e/*.spec.ts`. The `test:e2e:*` scripts in `package.json` target specific suites (terminal rendering/perf golden tests, SSH, source-control scale, etc.) — prefer those over running the whole Playwright project when iterating.

### Typecheck realms

`tsc` is split into three project configs because the code runs in three different environments — a change can pass one and fail another:

- **node** (`config/tsconfig.node.json`) — `src/main`, `src/preload`, `src/shared`, `src/relay`, `src/types`. Electron main + Node.
- **web** (`config/tsconfig.tc.web.json`) — `src/renderer`. DOM/React.
- **cli** (`config/tsconfig.tc.cli.json`) — `src/cli`.

Use `pnpm tc:node` / `pnpm tc:web` / `pnpm tc:cli` to check one realm.

## Process architecture

Orca is a standard Electron three-tier split, with a fourth process type (the relay) for remote execution. Every module lives under `src/<realm>/` and the realm dictates which globals and tsconfig apply.

- **`src/main/`** — Electron main process. ~75 feature subdirectories, one per domain (`git/`, `browser/`, `computer/`, `daemon/`, per-agent dirs like `claude/`, `codex/`, `gemini/`, plus account/usage trackers). This is where terminals (`node-pty`), git, filesystem, agent process spawning, and OS integration live. Additional entry points beyond `index.ts` are forked as separate processes/workers (`daemon/daemon-entry.ts`, `computer/sidecar-entry.ts`, `speech/stt-worker.ts`, file/parcel watchers) — see `electron.vite.config.ts` `rollupOptions.input`.
- **`src/preload/index.ts`** — the single audited IPC bridge (`contextBridge`) between renderer and main. All renderer↔main calls funnel through here; it is intentionally one large file so the security surface and type contract stay reviewable. `src/main/ipc/` holds the main-side handlers.
- **`src/renderer/src/`** — React 19 + Tailwind v4 + Zustand UI. Components under `components/<feature>/`, global state in `store/`, shadcn primitives in `components/ui/`. Import aliases `@renderer` and `@` both point at `src/renderer/src`. Host content (Monaco editor, xterm terminals, Markdown/PDF previews) is framed by Orca's own quiet chrome — see `docs/STYLEGUIDE.md`.
- **`src/relay/`** — a JSON-RPC-over-frames protocol server (`protocol.ts`, `dispatcher.ts`, `fs-handler*`, `git-handler*`, `agent-exec-handler*`) that runs the same git/fs/terminal operations on a **remote host** (SSH box, WSL distro, headless `orca serve`). This is the backbone of the SSH-worktree feature: local main talks to a remote relay so file editing, git, and terminals work identically whether the worktree is local or remote. Any change to git/fs/terminal behavior must work through both the local path and the relay.
- **`src/shared/`** — pure, environment-agnostic modules imported by all realms (agent detection, status parsing, tab titles, prompt handling). Keep it free of Electron/DOM/Node-only APIs so every realm can consume it. CI typechecks `src/shared` and `src/preload` strictly — see `docs/preload-typecheck-hole.md` and prefer `.ts` over `.d.ts`.
- **`src/cli/`** — the `orca` CLI (`bin` → `out/cli/index.js`) that lets agents drive Orca (`orca worktree create`, `snapshot`, `click`, `fill`). It talks to a running app via a runtime client.

`mobile/` is a separate React Native/Expo companion app with its own `package.json`, lockfile, and lint config — treat it as a distinct project (note its `.oxlintrc.json` `max-lines` rule is off-limits per AGENTS.md).

## Enforced gates beyond typecheck/lint

`pnpm lint` runs several custom gate scripts (in `config/scripts/`) that fail the build; these are not optional style nits:

- **max-lines** — oxlint caps files at 300 lines (`.ts`), 400 (`.tsx`), 600 (`.mjs`), 800 (tests). `check-max-lines-ratchet.mjs` enforces a monotonic downward ratchet against `config/max-lines-baseline.txt`. **Never** add a `max-lines` disable or bump the baseline up (AGENTS.md) — split the file instead.
- **reliability-gates** (`config/reliability-gates.jsonc`) — a manifest tracking test/flake/protection status for reliability-critical features; `check-reliability-gates.mjs` validates its shape.
- **switch-exhaustiveness** — type-aware oxlint pass; no default case is allowed to stand in for exhaustive handling of a union.
- **styled-scrollbars** — custom scrollbar styling is checked for consistency.
- **localization** — `verify:localization-catalog` and `verify:localization-coverage` keep the i18n catalog (i18next) complete. When adding user-facing strings, run `pnpm sync:localization-catalog`.

## Telemetry gate (why dev builds don't transmit)

Telemetry is off in every non-official build by compile-time substitution, not a runtime flag. `electron.vite.config.ts` folds `ORCA_BUILD_IDENTITY` / `ORCA_POSTHOG_WRITE_KEY` to literal `null` unless CI secrets are set, so `IS_OFFICIAL_BUILD` in `src/main/telemetry/client.ts` is `false` and `track()` short-circuits to a console mirror. A contributor cannot enable transmission via env var. Don't add a runtime env fallback for these.

## Design docs

`docs/` is the design-decision archive: `docs/reference/` holds durable contracts (notably `git-compatibility.md`, and the terminal architecture set — `terminal-main-owned-state.md`, `terminal-scroll-intent-architecture.md`, `terminal-*-authority.md`), while the top-level `docs/*.md` are per-feature design notes. When touching terminals, git compatibility, or SSH, read the relevant doc first — the invariants there are load-bearing and easy to break.
