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

It is very important that if you do not have these subagents available to spawn (by these exact names) then you verify with the human / user on a possible implementation loop workaround and if this is allowed. Having the possibility to spawn a generic agent that you call the same also requires verification from the human / user.

## Input
- A plan file path, pasted implementation plan, or freeform implementation request.
- The original implementation plan, task prompt, or approved scope.
- Any user constraints, validation requirements, or stopping rules.
- Potentially follow up changes from the human after the loop finishes, which may require spawning a new loop.

## Process
1. If the user provides a plan file path, read the full plan.
2. If the user provides a freeform prompt, treat it as the implementation scope.
3. For a freeform prompt, first turn it into a small implementation plan before running the loop.
4. Ask clarification questions when the scope is too ambiguous or risky to start.
5. Then run the implementation/review loop (step 6) with:
   - the full original scope;
   - relevant user constraints;
   - expected validation, if known;
   - any max-round or stopping preference from the user.
6. Spawn one `code-implementer` (user specificed if there's multiple) agent with the full original plan or task prompt, plus the short working brief, and ask it to implement only that scope.
7. When the implementer finishes, spawn one `code-reviewer` (user specificed if there's multiple) agent with:
   - the original scope;
   - the implementer's summary;
   - the changes made by the implementer, using the current diff or changed files as evidence.
8. If the reviewer returns `APPROVED`, stop the loop and summarize the result.
9. If the reviewer returns `CHANGES_REQUESTED`, synthesize only the required fixes into a focused prompt and spawn a new `code-implementer` agent.
10. Repeat implementer -> reviewer until approval.

## Loop Contract
- The orchestrator runs implementer -> reviewer rounds.
- Implementers write code; reviewers review code; neither controls the loop.
- Reviews produce approval or actionable required fixes, not new plans.
- The loop ends when the reviewer approves or the orchestrator hits a blocker that needs the user.

## Rules
- You are the orchestrator and act only as the loop controller.
- Use only one writing implementer at a time against the active worktree.
- Do not ask reviewers or implementers to create a new implementation plan.
- Do not blindly forward optional reviewer suggestions; include only fixes needed for approval.
- Pause and ask the user if a finding requires a product, scope, or architecture decision not covered by the original request.
- If the same issue repeats, stop and report the blocker instead of continuing for eternity.

## Output
When the loop finishes, report:
- number of implementation/review rounds;
- final approval status;
- changed files;
- validation performed;
- unresolved blockers or intentionally deferred items, if any.
- A potential git commit message summarizing the final changes, if applicable. Use the `commit-message-generate` skill if available.
