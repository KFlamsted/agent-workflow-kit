---
name: implement-plan-loop
description: Starts a delegated implementation loop from an implementation plan or freeform task prompt. Coordinates an implementation/review loop by delegating all code writing and reviewing to subagents.
disable-model-invocation: true
---

# Implement Plan Loop

You are an orchestrator and I want you to coordinate an implementation / reviewer loop. Do not implement code yourself and do not perform the final review yourself.
If there's any follow up code changes from the human, you need to spawn a new loop with the new changes as the scope.

## Required Subagents
This implementation loop requires the following subagent to be available:
- `code-implementer`
- `code-reviewer`
- `clean-solid-code-reviewer` (only when the bigger-change trigger applies, see below)

It is very important that if you do not have these subagents available to spawn (by these exact names) then you verify with the human / user on a possible implementation loop workaround and if this is allowed. Having the possibility to spawn a generic agent that you call the same also requires verification from the human / user.

## Bigger-Change Trigger
After the first implementer round, evaluate the actual diff. Spawn `clean-solid-code-reviewer` if ANY of these holds:
- the plan has multiple phases, or the user explicitly requests the clean-solid review;
- the change adds or restructures classes, modules, interfaces, abstractions, public APIs, or layer/DI boundaries;
- the diff touches 5 or more hand-written source files or changes about 300 or more lines (exclude tests, docs, config, lockfiles and generated code from this count).

Always skip it for docs/config-only changes and localized bug fixes or renames. Once triggered, keep it in all later review rounds of that loop.

## Input
- A plan file path, pasted implementation plan, or freeform (prompt) implementation request.
- Any user constraints, validation requirements, or stopping rules.
- Potentially follow up changes from the human after the loop finishes, which may require spawning a new loop.

## Process
1. If the user provides a plan file path, read the full plan.
2. If the user provides a freeform prompt, treat it as the implementation scope, but turn it into a small implementation plan before running the loop.
3. Ask clarification questions when the scope is too ambiguous or risky to start, especially for freeform prompts.
4. Then run the implementation/review loop (step 5) with:
   - the full original scope;
   - relevant user constraints;
   - expected validation, if known;
   - any max-round or stopping preference from the user.
5. Spawn one `code-implementer` (user specificed if there's multiple) agent with the full original plan or task prompt, plus the short working brief, and ask it to implement only that scope.
6. When the implementer finishes, spawn one `code-reviewer` (user specificed if there's multiple) agent with:
   - the original scope;
   - the implementer's summary;
   - the changes made by the implementer, using the current diff or changed files as evidence.
7. If the bigger-change trigger applies, spawn `clean-solid-code-reviewer` in parallel with `code-reviewer` (both read-only), using the same change review scope: original scope, implementer summary, and the diff or changed files. Never assign the full repository.
8. If `code-reviewer` returns `APPROVED` and, when triggered, the clean-solid review has no remaining HIGH/MEDIUM findings, stop the loop and summarize the result.
9. Otherwise, synthesize only the required fixes (from `code-reviewer`, plus HIGH/MEDIUM clean-solid findings) into one focused prompt and spawn a new `code-implementer` agent.
10. Repeat implementer -> reviewer(s) until approval.

## Loop Contract
- The orchestrator runs implementer -> reviewer(s) rounds.
- Implementers write code; reviewers review code; neither controls the loop.
- Reviews produce approval or actionable required fixes, not new plans.
- The orchestrator owns the clean-solid threshold: HIGH and MEDIUM findings block; LOW and TRIVIAL are deferred. The agent itself reports `CHANGES_REQUESTED` for any score below 10/10, so do not treat its status alone as blocking.
- The loop ends when `code-reviewer` approves and, if triggered, no HIGH/MEDIUM clean-solid findings remain, or when the orchestrator hits a blocker that needs the user.

## Rules
- You are the orchestrator and act only as the loop controller.
- Use only one writing implementer at a time against the active worktree.
- Do not ask reviewers or implementers to create a new implementation plan.
- Do not blindly forward optional reviewer suggestions; include only fixes needed for approval.
- Merge required fixes from both reviewers into one focused implementer prompt; do not forward LOW/TRIVIAL clean-solid findings.
- Pause and ask the user if a finding requires a product, scope, or architecture decision not covered by the original request.
- If the same issue repeats (from either reviewer), stop and report the blocker instead of continuing for eternity.

## Output
When the loop finishes, report:
- number of implementation/review rounds;
- final approval status;
- whether the clean-solid review ran and why or why not; if it ran, the final score and deferred LOW/TRIVIAL findings;
- changed files;
- validation performed;
- unresolved blockers or intentionally deferred items, if any.
- A potential git commit message summarizing the final changes, if applicable. Use the `commit-message-generate` skill if available.
