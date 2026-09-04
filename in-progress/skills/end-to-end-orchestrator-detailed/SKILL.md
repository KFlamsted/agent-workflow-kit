---
name: end-to-end-orchestrator-detailed
description: Orchestrates a software task through research, Gherkin behaviour planning, architecture, an INVEST implementation plan, then implement/review with local commits and resumable task folders. Only user / human invoked.
disable-model-invocation: true
---

# End-to-End Orchestrator Detailed

The goal of this session is to take a software task given by the human (via a prompt) and take that prompt all the way to final implementation through a detailed planning pipeline and phased implement/review loop.

You are the coordinator/orchestrator. Do not plan, implement, or review application code yourself. Do not write `code-base.md`, `gherkin.md`, `architectural.md`, or `implementation-plan.md`. Delegate those tasks to subagents, coordinate the workflow, relay clarification questions, tick Progress checkboxes after approval, and produce the final summary.

Allowed orchestrator writes: `prompt.md` (verbatim human prompt) and ticking Progress checkboxes in `implementation-plan.md` after reviewer `APPROVED`.

The end-to-end process consists of:

1. Create or resume a task folder and run the planning pipeline. (See [Task folder](#task-folder), [Start vs resume](#start-vs-resume), [Planning loop](#planning-loop))
2. Implement and review code in an implementer-to-reviewer loop with local commits per phase. (See [Implement and review loop](#implement-and-review-loop))
3. Conduct a final summary of the entire process. (See [Final summary](#final-summary))

Each step is described in detail in the referenced subsections.

## Input

- A task description from the user.
- Optionally, an existing `tasks/XXXXX-<slug>/` path to resume.

## Required subagents — IMPORTANT!

This workflow requires the following subagents to be available:

- `code-researcher` — researches the codebase and writes `code-base.md`.
- `gherkin-planner` — clarifies behavioural requirements and writes `gherkin.md`.
- `architect-planner` — clarifies architectural choices or records `Status: SKIPPED`, then writes `architectural.md`.
- `code-planner` — clarifies remaining technical decisions and writes an INVEST-sized `implementation-plan.md`.
- `git-committer` — creates a local git commit for an explicit file list. Never pushes.
- `code-implementer` — implements and validates an assigned implementation unit.
- `code-reviewer` — reviews an implementation unit and returns `APPROVED` or `CHANGES_REQUESTED`.

It is very important before starting the workflow to ensure all required subagent types are available to spawn. They must have the exact same names and you may not generate them or spawn any agent with a similar name.

If any of these are unavailable, stop the workflow and report the missing dependency rather than substituting another agent or performing its responsibilities yourself.

## Task folder

Task folders live in the repo root.

Path: `tasks/XXXXX-<slug>/`

- `XXXXX` is a 5-digit increment: scan `tasks/` for directories matching `^\d{5}-`; next id is max + 1, or `00001` if none. Create `tasks/` if missing.
- `<slug>`: short hyphenated name from the human prompt (lowercase, non-alphanumeric → `-`, collapse hyphens, trim to about 40 characters). On collision, append `-2`, `-3`, …

Artifacts in that folder only:

- `prompt.md`
- `code-base.md`
- `gherkin.md`
- `architectural.md`
- `implementation-plan.md`

Hard gates (a later step cannot start without the prior file):

`prompt.md` → `code-base.md` → `gherkin.md` → `architectural.md` → `implementation-plan.md`

Architecture is optional only in **content**. `architectural.md` must still exist. If no architectural decisions are needed, it starts with `Status: SKIPPED` and a short rationale.

## Start vs resume

**Resume** when the human prompt includes an existing `tasks/XXXXX-…` path:

- If the passed path does not exist, stop and report.
- Determine the next step from missing artifacts, then from the first unchecked Progress box in `implementation-plan.md`.

**New task** when no such path is passed:

- Always create a new folder (even if incomplete tasks exist elsewhere).
- Write `prompt.md` with the human prompt **verbatim**.
- Spawn `git-committer` for `prompt.md` only.

Do not auto-resume a task unless the human passed a task folder path.

## Planning loop

For each planner spawn: pass the verbatim human prompt plus the task folder path and tell the agent to read prior artifacts. Do not rewrite the human prompt. Do not add output-format instructions; rely on the agent prompt.

### Clarification relay

When a planner returns `NEEDS_CLARIFICATION`, relay its questions to the human unchanged. Do not answer or infer answers yourself. Do not insert a confirmation step of your own.

Resume the same planner session when supported; otherwise spawn a new one with the original prompt, preserved context, and the full question-and-answer history. Repeat until the artifact is written.

### Commits after each artifact

After each artifact exists (`prompt.md` and each planner output), spawn `git-committer` with **only that file's path**.

### Planning order

Refuse to start a step if the previous artifact is missing.

1. `prompt.md` (orchestrator writes verbatim) → `git-committer`
2. `code-researcher` → `code-base.md` → `git-committer`
3. `gherkin-planner` → `gherkin.md` → `git-committer`
4. `architect-planner` → `architectural.md` (decisions or `Status: SKIPPED`) → `git-committer`. **Always** spawn this agent; do not skip it.
5. `code-planner` → `implementation-plan.md` → `git-committer`

Once the implementation plan exists, proceed to [Implement and review loop](#implement-and-review-loop).

## Implement and review loop

Ensure `implementation-plan.md` exists in the task folder. Treat each Progress checkbox as one implementation unit; if the plan has no phases, treat the full plan as one unit.

For each unit, in order:

1. Spawn a new `code-implementer` to implement and validate the unit. Point it at the task folder's `implementation-plan.md` and the current unchecked phase.
2. Spawn a new `code-reviewer` to review the result against the implementation plan and current unit.
3. If the result is `CHANGES_REQUESTED`, resume the same implementer with only the required fixes, then resume the same reviewer to review the changes.
4. Repeat until the reviewer returns `APPROVED`.
5. After `APPROVED`: set that phase's Progress box to `- [x]` in `implementation-plan.md`, then spawn `git-committer` with an explicit path list of the phase's changed files **and** `implementation-plan.md`. Pass paths from the implementer handoff or diff — never `git add -A`.
6. Continue to the next unit with a new implementer/reviewer pair.

Use new implementer and reviewer sessions for each unit. After all units are approved, proceed to [Final summary](#final-summary).

## Final summary

After all Progress boxes are checked and approved, report:

- the original task and plan path (`tasks/XXXXX-<slug>/implementation-plan.md`);
- the units completed and implementation/review rounds for each;
- the final approval status;
- the changed files and a brief summary of the changes;
- validation performed and its results (only if reported by a subagent);
- unresolved blockers or intentionally deferred items, if any;
- a suggested commit message, if applicable — use the `commit-message-generate` skill if available (informational; commits already happened per phase).

Do not claim validation was performed unless it was reported by a subagent.

## Extra rules and guidelines

- Remain the orchestrator; do not implement or review code yourself.
- `git-committer` is the only subagent that runs git commits. Never push.
- Use only one writing implementer at a time against the active worktree.
- Do not ask implementers or reviewers to create a new implementation plan.
- Forward only changes required for approval, not optional reviewer suggestions.
- Ask the human if a finding requires a product, scope, or architecture decision not covered by the artifacts.
- If an issue repeats or the loop becomes stuck, stop and report the blocker instead of continuing indefinitely.
- Do not fill the main session with artifact contents beyond paths and planner questions.
