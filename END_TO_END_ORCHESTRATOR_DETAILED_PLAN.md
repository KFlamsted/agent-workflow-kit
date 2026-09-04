# End-to-End Orchestrator Detailed — Implementation Plan

## Goal

Add a new detailed end-to-end workflow: skill `end-to-end-orchestrator-detailed` plus five new agents. Planning is split into research → Gherkin behaviour → architecture → INVEST implementation plan. Then the existing implementer/reviewer loop runs, with resumable `tasks/` folders and local commits after each artifact and each approved phase.

The existing `end-to-end-orchestrator` skill and all existing agents stay unchanged.

## Non-goals

- Do not edit `skills/end-to-end-orchestrator/` or any existing file under `agents/` (including `task-planner.txt`, `code-implementer.txt`, `code-reviewer.txt`, `clean-solid-code-reviewer.txt`, and their harness configs).
- Do not replace or rename the current orchestrator.
- Do not put the new skill under `skills/` (it belongs in `in-progress/`).
- Do not change `README.md`, `scripts/copy-skills.js`, or copy/remove scripts unless a test failure forces a one-line fix (it should not).
- Do not add Final Integration Review.
- Do not auto-resume a task unless the human passed a task folder path.
- Do not push commits (the `git-committer` prompt must forbid push).

## Progress

- [ ] Phase 1: New agents (shared prompts, harness configs, copy-agent test)
- [ ] Phase 2: In-progress orchestrator skill

## Relevant files (read, do not edit)

- `skills/end-to-end-orchestrator/SKILL.md` — orchestration tone, required-subagent gate, clarification relay, implement/review loop, final summary, extra rules. Mirror the style; do not copy the single `task-planner` planning step.
- `agents/task-planner.txt` — clarification protocol (`NEEDS_CLARIFICATION` / `NEEDS_CONFIRMATION`), grill-then-confirm-then-write. Copy the **approach**, not the identity or output path.
- `skills/create-implementation-plan/SKILL.md` — grill-me wording (options + recommended default, confirm before writing).
- `agents/code-implementer.txt` and `agents/code-reviewer.txt` — reused unchanged by the new skill.
- Harness templates to clone metadata from:
  - Planners: `agents/cursor/task-planner.md`, `agents/claude/task-planner.md`, `agents/copilot/task-planner.agent.md`, `agents/opencode/task-planner.md`, `agents/codex/task-planner.toml`, `agents/pi/task-planner/task-planner.md`
  - Committer: the matching `code-implementer` file in each harness
- `scripts/copy-skills.js` — injects `agents/<stem>.txt` into copied harness files by filename stem. New `.txt` stem must match the harness filename stem (`code-researcher`, `gherkin-planner`, `architect-planner`, `code-planner`, `git-committer`).
- `test/copy-agents.test.js` — existing injection tests; extend, do not rewrite.
- Cursor `create-skill` skill (read before writing the skill in Phase 2): keep `SKILL.md` under 500 lines, third-person description, `disable-model-invocation: true`.

## Shared conventions (both phases)

### Agent names (exact)

`code-researcher`, `gherkin-planner`, `architect-planner`, `code-planner`, `git-committer`

Plus reused: `code-implementer`, `code-reviewer`

### Harness metadata

Copy the sibling template’s YAML/TOML structure. Change only `name` and `description`. Keep the same models, tools, permissions, and flags as the template named below.

| New agent | Metadata template | Notes |
|---|---|---|
| `gherkin-planner` | `task-planner` | Needs write + question |
| `architect-planner` | `task-planner` | Needs write + question |
| `code-planner` | `task-planner` | Needs write + question |
| `code-researcher` | `task-planner` | Needs write to create `code-base.md`. Behaviour is research-only (no grill-me, no decisions). Do **not** set Cursor `readonly: true`. |
| `git-committer` | `code-implementer` | Needs write/bash for `git add`/`git commit`. No `readonly`. |

Descriptions to use in every harness frontmatter (and keep consistent):

- `code-researcher`: `Researches the codebase and existing solutions for a task and writes code-base.md. Use for the research phase of end-to-end-orchestrator-detailed. Makes no product or architecture decisions.`
- `gherkin-planner`: `Clarifies behavioural requirements and writes a Gherkin behaviour spec. Use for the behaviour phase of end-to-end-orchestrator-detailed. Does not make technical or architecture decisions.`
- `architect-planner`: `Clarifies architectural choices or records Status: SKIPPED when none are needed, then writes architectural.md. Use for the architecture phase of end-to-end-orchestrator-detailed.`
- `code-planner`: `Clarifies remaining technical decisions and writes an INVEST-sized implementation plan with progress checkboxes. Use for the implementation-planning phase of end-to-end-orchestrator-detailed.`
- `git-committer`: `Creates a local git commit for an explicit file list. Never pushes. Use after each planning artifact or reviewer-approved implementation phase.`

### Shared planner protocol (gherkin / architect / code-planner only)

Include this protocol in those three prompts, adapted from `agents/task-planner.txt` (do not paste the task-planner goal/output path):

- May spawn `explore` if available; do not overdo it.
- Clarification protocol: use `AskQuestion` / `question` when available; otherwise return `NEEDS_CLARIFICATION` or `NEEDS_CONFIRMATION` with focused questions, why they matter, options + recommended default when practical, and a `Preserved context` section. Then end the invocation. Do not claim to be waiting.
- When reinvoked, treat original task + prior findings + full Q&A as continuation. Do not re-ask answered questions.
- Grill-me: persistent, not deferential. Probe vague terms, implied workflows, and unstated edge cases. If an answer uses subjective language (`simple`, `normal`, `fast`, `user-friendly`), ask what observable behaviour it implies. Explain why each question matters.
- After grilling, summarize agreed requirements / decisions / non-goals / assumptions and ask for confirmation. Do not write the artifact until confirmed.
- Do not modify existing project code. Only create/overwrite the assigned artifact in the given task folder.
- Do not run git commits (that is `git-committer`).
- After writing, return the artifact path and a concise summary. Do not claim the parent workflow is complete.

### Task folder (consumer repo, not this kit)

Path: `tasks/XXXXX-<slug>/`

- `XXXXX` is a 5-digit increment: scan `tasks/` for directories matching `^\d{5}-`; next id is max + 1, or `00001` if none. Create `tasks/` if missing.
- `<slug>`: short hyphenated name from the human prompt (lowercase, non-alphanumeric → `-`, collapse hyphens, trim to about 40 characters). On collision, append `-2`, `-3`, …
- Artifacts in that folder only: `prompt.md`, `code-base.md`, `gherkin.md`, `architectural.md`, `implementation-plan.md`

Hard gates (later phase cannot start without the prior file):

`prompt.md` → `code-base.md` → `gherkin.md` → `architectural.md` → `implementation-plan.md`

Architecture is optional only in **content**. `architectural.md` must still exist. If no architectural decisions are needed, it starts with `Status: SKIPPED` and a short rationale.

---

## Phase 1 — New agents

Add the five new agents so `npm run copy-agents` can install them. No skill yet.

### 1. Shared prompt bodies

Create these five files. Each must be a complete agent prompt (goal, input, process, output, constraints). They must not identify themselves as `task-planner`.

#### `agents/code-researcher.txt`

- Goal: research only. Write `code-base.md` in the task folder supplied by the orchestrator.
- Input: verbatim human prompt, task folder path, and `prompt.md` once it exists.
- Process:
  1. Read the prompt and inspect the target codebase (and existing solutions in-repo or publicly documented patterns already present).
  2. Record facts: structure, relevant files, current behaviour, constraints, analogous existing code.
  3. If multiple technical options exist, list them as **observations**, not recommendations. Do not pick.
  4. No grill-me, no confirmation gate, no product/architecture/implementation decisions.
  5. Write `code-base.md`.
- Output: path + short summary of what was found.
- Forbidden: changing application code; writing other artifacts; committing.

Suggested `code-base.md` shape (instruct the agent to use this):

```md
# Codebase research

## Relevant areas
## Current behaviour
## Constraints and patterns
## Observed options (not decisions)
```

#### `agents/gherkin-planner.txt`

- Goal: behavioural decisions only, Gherkin format, write `gherkin.md`.
- Input: verbatim prompt, task folder, `prompt.md`, `code-base.md`. Hard-stop if `code-base.md` is missing.
- Scope: user-visible behaviour, workflows, edge cases, failure behaviour, acceptance criteria.
- Forbidden topics: frameworks, libraries, repo layout, APIs, class design, file lists.
- Process: shared planner protocol, then write `gherkin.md` only after confirmation.
- Output: Gherkin `Feature` / `Scenario` / `Given` / `When` / `Then` (and `And` / `But` as needed) covering main flows, edges, and failures agreed with the human.

#### `agents/architect-planner.txt`

- Goal: architectural decisions, or an explicit skip. Write `architectural.md`.
- Input: verbatim prompt, task folder, `prompt.md`, `code-base.md`, `gherkin.md`. Hard-stop if any prior artifact is missing.
- Always runs (the orchestrator does not decide to skip this agent).
- If the existing stack already satisfies the Gherkin behaviour and no new framework/library/repo-shape choice is required: propose `Status: SKIPPED` with a short rationale, confirm, then write that.
- If decisions are needed: grill only architecture (frameworks, tools/libraries, repo format, system boundaries). Confirm, then write.
- Forbidden: rewriting Gherkin; detailed implementation steps; inventing behaviour.
- `architectural.md` when skipped:

```md
# Architecture

Status: SKIPPED

## Rationale
...
```

- `architectural.md` when not skipped: decisions, rejected alternatives (briefly), constraints the implementation plan must honour.

#### `agents/code-planner.txt`

- Goal: remaining technical decisions that are not architecture. Write `implementation-plan.md` detailed enough that a mid-level engineer with no prior context can implement it (same bar as task-planner step 8).
- Input: verbatim prompt, task folder, and all four prior artifacts. Hard-stop if any are missing. If architecture is `Status: SKIPPED`, still use that file as input.
- Process: shared planner protocol, then write only after confirmation.
- Phase sizing: **INVEST**. Prefer few valuable increments (typically 2–6), not many chore-sized phases. Do not split “add file” / “add tests” unless each is independently valuable. Each phase must be independently implementable, valuable, estimable, small enough for one implementer session, and testable. Do not add a “split this phase further” instruction to the parent orchestrator.
- `implementation-plan.md` must include:
  - goal, non-goals, assumptions
  - relevant files
  - numbered phases with concrete steps
  - validation per phase
  - a **Progress** checklist the orchestrator can tick:

```md
## Progress
- [ ] Phase 1: <title>
- [ ] Phase 2: <title>
```

- Forbidden: changing application code; committing; using `<TASK_NAME>_PLAN.md` in the repo root (this workflow writes only `tasks/…/implementation-plan.md`).

#### `agents/git-committer.txt`

- Goal: one local commit of an explicit file list. Never push.
- Input from orchestrator: short change context, **exact paths to stage**, optional suggested type/scope.
- Process:
  1. `git status` / `git diff` / `git log` (recent messages) only as needed to craft the commit.
  2. Stage **only** the listed paths. Never `git add -A` or `git add .`.
  3. Leave unrelated dirty files unstaged. If a listed path is missing or the commit would include unlisted files, stop and report a blocker.
  4. If there is nothing to commit, report that and exit successfully (do not create an empty commit).
  5. Message: Conventional Commits (`type(scope): summary`). Use the `commit-message-generate` skill if available; otherwise write the message the same way. Pass the message via HEREDOC (`git commit -m "$(cat <<'EOF' … EOF)"`).
  6. Never: `git push`, update git config, `--no-verify`, `--no-gpg-sign`, `--amend`, force, rebase, reset.
- Output: commit hash + subject, or “nothing to commit”, or a blocker.

### 2. Per-tool configs (create only; do not edit existing)

For each of the five agents, add the matching harness file. Filename stem must equal the `.txt` stem (Pi uses a directory of the same name containing `<stem>.md`).

| Harness | Path pattern | Clone from |
|---|---|---|
| Cursor | `agents/cursor/<stem>.md` | planner or implementer as in the metadata table |
| Claude | `agents/claude/<stem>.md` | same |
| Copilot | `agents/copilot/<stem>.agent.md` | same |
| OpenCode | `agents/opencode/<stem>.md` | same |
| Codex | `agents/codex/<stem>.toml` | same |
| Pi | `agents/pi/<stem>/<stem>.md` | same |

That is 5 agents × 6 harnesses = 30 new metadata files, plus 5 prompt files.

### 3. Test

In `test/copy-agents.test.js`, add a focused assertion (same style as the existing `task-planner` / `code-implementer` checks) that `code-planner` (and ideally `git-committer`) injects: copied harness file starts with the source metadata, ends with the matching `.txt` body, body occurs once.

Do not restyle the rest of the test file.

### Phase 1 validation

- `npm test` passes.
- `node scripts/copy-skills.js --cursor-agents --env <temp>` (or the existing test sandbox) produces the new agent files with injected bodies.
- No existing skill or agent file is in the diff.

---

## Phase 2 — In-progress orchestrator skill

Create `in-progress/skills/end-to-end-orchestrator-detailed/SKILL.md` only (optional `reference.md` if templates would push `SKILL.md` over ~500 lines; prefer keeping templates in the agent prompts).

Read and follow the Cursor `create-skill` skill before writing.

### Frontmatter

```yaml
---
name: end-to-end-orchestrator-detailed
description: Orchestrates a software task through research, Gherkin behaviour planning, architecture, an INVEST implementation plan, then implement/review with local commits and resumable task folders. Use when the user invokes end-to-end-orchestrator-detailed or wants a more detailed end-to-end workflow than end-to-end-orchestrator.
disable-model-invocation: true
---
```

### Skill behaviour (implement all of this in the skill text)

Stay the coordinator. Do not plan, implement, or review application code. Do not write `code-base.md`, `gherkin.md`, `architectural.md`, or `implementation-plan.md`. Allowed orchestrator writes: `prompt.md` (verbatim) and ticking Progress checkboxes in `implementation-plan.md` after reviewer `APPROVED`.

**Required subagents** (exact names; if any are missing, stop and report; do not substitute or self-perform):

`code-researcher`, `gherkin-planner`, `architect-planner`, `code-planner`, `git-committer`, `code-implementer`, `code-reviewer`

**Start vs resume**

- If the human prompt includes an existing `tasks/XXXXX-…` path, resume that folder. Determine the next step from missing artifacts, then from the first unchecked Progress box.
- If no such path is passed, always create a new folder (even if incomplete tasks exist). Write `prompt.md` with the human prompt **verbatim**, then spawn `git-committer` for that file only.
- If a passed path does not exist, stop and report.

**Planning loop** (hard-gated). For each planner spawn: pass the verbatim human prompt plus the task folder path and tell the agent to read prior artifacts. Do not rewrite the human prompt. Do not add output-format instructions; rely on the agent prompt.

Relay `NEEDS_CLARIFICATION` / `NEEDS_CONFIRMATION` to the human unchanged. Do not answer or infer. Resume the same planner session when supported; otherwise spawn a new one with original prompt, preserved context, and the full Q&A history.

After each artifact exists (`prompt.md` and each planner output), spawn `git-committer` with only that file’s path.

Order:

1. `prompt.md` (orchestrator) → commit
2. `code-researcher` → `code-base.md` → commit
3. `gherkin-planner` → `gherkin.md` → commit
4. `architect-planner` → `architectural.md` (decisions or `Status: SKIPPED`) → commit. Always spawn this agent.
5. `code-planner` → `implementation-plan.md` → commit

Refuse to start a step if the previous artifact is missing.

**Implement / review loop** (same mechanics as `skills/end-to-end-orchestrator/SKILL.md`, plus commits and checkboxes):

- Each Progress checkbox is one unit. If there are no phases, treat the whole plan as one unit.
- New `code-implementer` then new `code-reviewer` per unit.
- On `CHANGES_REQUESTED`, resume the same implementer with only required fixes, then the same reviewer. Repeat until `APPROVED`.
- Forward only required fixes, not optional suggestions.
- After `APPROVED`: orchestrator sets that phase’s box to `- [x]`, then `git-committer` commits the phase’s changed files **and** `implementation-plan.md`. Orchestrator must pass an explicit path list (from the implementer handoff / diff), not `git add -A`.
- New implementer/reviewer pair for the next unit.
- One writing implementer at a time.
- Do not ask implementers/reviewers to create a new plan.
- Ask the human if a finding needs a product/scope/architecture decision not in the artifacts.
- If the loop sticks or the same issue repeats, stop and report.

**Final summary** after all boxes are checked, same bullets as the current orchestrator:

- original task and plan path
- units completed and implement/review rounds
- final approval status
- changed files and brief summary
- validation performed and results (only if a subagent reported it)
- unresolved or deferred items
- suggested commit message via `commit-message-generate` if available (informational; commits already happened per phase)

**Extra rules** (keep): orchestrator-only coordination; no push; `git-committer` is the only git writer; do not fill the main session with artifact contents beyond paths and planner questions.

### Phase 2 validation

- File exists at `in-progress/skills/end-to-end-orchestrator-detailed/SKILL.md`.
- Frontmatter `name` is `end-to-end-orchestrator-detailed`.
- Required subagent list matches Phase 1 names exactly.
- Skill does not instruct the orchestrator to skip spawning `architect-planner`.
- Skill does not instruct auto-resume without a user-supplied path.
- `skills/end-to-end-orchestrator/SKILL.md` is unmodified.
- `npm test` still passes.
- `SKILL.md` stays under 500 lines.

No browser verification (this is agent/skill markdown, not a web UI).

---

## Risks

- **Prompt injection pairing:** if a harness filename stem does not match `agents/<stem>.txt`, `copy-skills.js` copies metadata without a body. Keep stems identical.
- **Researcher tools:** the agent must write `code-base.md`. Using reviewer `readonly` metadata would block the artifact. Use planner-like write permissions; keep research-only behaviour in the prompt.
- **Dirty worktrees:** `git-committer` must never stage unrelated files. The skill must pass explicit paths.
- **Copilot stateless planners:** the skill must relay questions and re-spawn with full history, same as the current orchestrator.
- **Skill not installed by `copy-skills`:** expected, because the script only copies `skills/`. Do not “fix” this by moving the skill.

## Assumptions

- Task folders are created in the repo where the skill runs, not in this kit.
- Grill-me applies to gherkin, architecture, and code-planner only.
- `git-committer` never amends, even if a hook rewrites files; the orchestrator can spawn it again with the extra paths if needed.
- No README update (the repo already describes `in-progress/`).
- Existing `end-to-end-orchestrator` users keep using `task-planner`; this workflow never spawns `task-planner`.
