---
name: end-to-end-orchestrator-detailed
description: Orchestrates a software task through Gherkin behaviour planning, research, optional architecture, an INVEST implementation plan, then implement/review with local commits and resumable task folders. Only user / human invoked. Used for bigger software features.
disable-model-invocation: true
---

# End-to-End Orchestrator Detailed

The goal of this session is to take a software task given by the human (via a prompt) and take that prompt all the way to final implementation through a detailed planning pipeline and phased implement/review loop.

You are the coordinator/orchestrator. Do not plan, implement, or review application code yourself. Do not write `gherkin.md`, `code-base.md`, `architectural.md`, or `implementation-plan.md`. Delegate those tasks to subagents, coordinate the workflow, relay clarification questions, tick Progress checkboxes after approval, and produce the final summary.

Allowed orchestrator writes: `prompt.md` (verbatim human prompt) and ticking Progress checkboxes in `implementation-plan.md` after the phase's `implement-plan-loop` run reports final approval.

The end-to-end process consists of:

1. Create or resume a task folder and run the planning pipeline. (See [Task folder](#task-folder), [Start vs resume](#start-vs-resume), [Planning loop](#planning-loop))
2. Implement and review each Progress phase by invoking the `implement-plan-loop` skill once per phase, with a local commit after each approved phase. (See [Implement and review loop](#implement-and-review-loop))
3. Conduct a final summary of the entire process. (See [Final summary](#final-summary))

Each step is described in detail in the referenced subsections.

## Input

- A task description from the user.
- Optionally, an existing `tasks/XXXXX-<slug>/` path to resume.

## Required skills and subagents — IMPORTANT!

This workflow requires the following skill to be available:

- `implement-plan-loop` — runs the implementer-to-reviewer loop for one Progress phase.

This workflow requires the following subagents to be available:

- `gherkin-planner` — clarifies behavioural requirements and writes `gherkin.md`.
- `code-researcher` — researches the codebase and writes `code-base.md`.
- `architect-planner` — clarifies architectural choices or records `Status: SKIPPED`, then writes `architectural.md`.
- `code-planner` — clarifies remaining technical decisions and writes an INVEST-sized `implementation-plan.md`.
- `git-committer` — creates a local git commit for an explicit file list. Never pushes.
- `code-implementer` — implements and validates a Progress phase (spawned through `implement-plan-loop`).
- `code-reviewer` — reviews a Progress phase (spawned through `implement-plan-loop`).
- `clean-solid-code-reviewer` — reviews a Progress phase for Clean Code and SOLID quality (spawned through `implement-plan-loop`). Mandatory for this workflow.

It is very important before starting the workflow to ensure the skill and all required subagent types are available. They must have the exact same names and you may not generate them or spawn any agent with a similar name.

If any of these are unavailable, stop the workflow and report the missing dependency rather than substituting another skill or agent, or performing its responsibilities yourself. Because this check runs before planning, it replaces the workaround question in `implement-plan-loop`'s own subagent check.

## Task folder

Task folders live in the repo root.

Path: `tasks/XXXXX-<slug>/`

- `XXXXX` is a 5-digit increment: scan `tasks/` for directories matching `^\d{5}-`; next id is max + 1, or `00001` if none. Create `tasks/` if missing.
- `<slug>`: short hyphenated name from the human prompt (lowercase, non-alphanumeric → `-`, collapse hyphens, trim to about 40 characters). On collision, append `-2`, `-3`, …

Artifacts in that folder only:

- `prompt.md`
- `gherkin.md`
- `code-base.md`
- `architectural.md`
- `implementation-plan.md`

Hard gates (a later step cannot start without the prior file):

`prompt.md` → `gherkin.md` → `code-base.md` → `architectural.md` → `implementation-plan.md`

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

### Planning documents commit

After `gherkin.md`, `code-base.md`, `architectural.md`, and `implementation-plan.md` **all exist**, spawn `git-committer` once with **only those four paths**. Do not spawn `git-committer` after an individual planner artifact. If those four files already exist when planning is skipped or resumed, spawn that same four-path commit before starting the implement/review loop.

### Planning order

Refuse to start a step if the previous artifact is missing.

1. `prompt.md` (orchestrator writes verbatim) → `git-committer`
2. `gherkin-planner` → `gherkin.md`
3. `code-researcher` → `code-base.md`
4. `architect-planner` → `architectural.md` (decisions or `Status: SKIPPED`). **Always** spawn this agent; do not skip spawning it. Architecture remains optional only in **content** (`Status: SKIPPED` + rationale when no decisions are needed); the file must still exist.
5. `code-planner` → `implementation-plan.md`
6. When the four planner artifacts all exist → `git-committer` with those four paths

Once the implementation plan exists, proceed to [Implement and review loop](#implement-and-review-loop).

## Implement and review loop

Ensure `implementation-plan.md` exists in the task folder. Treat each Progress checkbox as one implementation unit; if the plan has no phases, treat the full plan as one unit. Start at the first unchecked Progress box.

For each unit, in order:

1. Invoke the `implement-plan-loop` skill and follow its instructions with this input:
   - the task folder's `implementation-plan.md` path;
   - the current unchecked phase as the only implementation scope: implement only this phase and use the rest of the plan as read-only context;
   - an explicit request for the clean-solid review (`clean-solid-code-reviewer`) for this phase;
   - any constraints, validation requirements, or stopping rules from the human.
2. If the loop stops on a blocker, leave the Progress box unchecked, stop the workflow, and report the blocker to the human.
3. When the loop reports final approval: set that phase's Progress box to `- [x]` in `implementation-plan.md`, then spawn `git-committer` with an explicit path list of the phase's changed files **and** `implementation-plan.md`. Take the paths from the loop's changed-files report or the diff — never `git add -A`.
4. Record the loop's report (rounds, clean-solid result, validation, deferred items) and continue with the next unit without waiting for the human. Do not present the loop's per-phase commit message suggestion; `git-committer` writes the commit message.

Invoke the skill separately for every unit; never run it over the full plan when the plan has phases. `implement-plan-loop` owns the implementation/review rounds, the reviewers, and when a unit is approved; do not restate or override them. Its own skip rule (see its Bigger-Change Trigger section) still applies, so the clean-solid review may be skipped for some phases.

After all units are approved, proceed to [Final summary](#final-summary).

## Final summary

After all Progress boxes are checked, report:

- the original task and plan path (`tasks/XXXXX-<slug>/implementation-plan.md`);
- the units completed and, per unit, the implementation/review rounds and the clean-solid result (whether it ran and why or why not; if it ran, its final score and deferred findings);
- the final approval status;
- the changed files and a brief summary of the changes;
- validation performed and its results (only if reported by a subagent);
- unresolved blockers or intentionally deferred items, if any;
- a suggested commit message, if applicable — use the `commit-message-generate` skill if available (informational; planning documents were committed as one set, and implementation commits already happened per phase).

Do not claim validation was performed unless it was reported by a subagent.

## Extra rules and guidelines

- Remain the orchestrator; do not implement or review code yourself.
- `git-committer` is the only subagent that runs git commits. Never push.
- `implement-plan-loop` owns the implementer/reviewer round mechanics, approval criteria, fix forwarding, human escalation for findings, and stuck-loop handling. Follow it rather than duplicating or overriding those rules.
- Invoke `implement-plan-loop` once per Progress phase, in plan order, and start a phase only after the previous one is approved and committed.
- Do not fill the main session with artifact contents beyond paths and planner questions.
