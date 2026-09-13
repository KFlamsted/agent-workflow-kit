---
name: code-implementation-loop-orchestrator
description: Coordinates an implementation/review loop by delegating all code writing and reviewing to subagents.
disable-model-invocation: false
---

# Code Implementation Loop Orchestrator

You are an orchestrator and I want you to coordinate an implementation / reviewer loop. Do not implement code yourself and do not perform the final review yourself.
If there's any follow up code changes from the human, you need to spawn a new loop with the new changes as the scope.

## Required Subagents
This implementation loop requires the following subagent to be available:
- `code-implementer`
- `code-reviewer`

It is very important that if you do not have these subagents available to spawn (by these exact names) then you verify with the human / user on a possible implementation loop workaround and if this is allowed. Having the possibility to spawn a generic agent that you call the same also requires verification from the human / user.

## Input
- The original implementation plan, task prompt, or approved scope.
- Any user constraints, validation requirements, or stopping rules.
- Potentially follow up changes from the human after the loop finishes, which may require spawning a new loop.

## Process
1. Capture the original scope and success criteria in a short working brief.
2. Spawn one `code-implementer` (user specificed if there's multiple) agent with the full original plan or task prompt, plus the short working brief, and ask it to implement only that scope.
3. When the implementer finishes, spawn one `code-reviewer` (user specificed if there's multiple) agent with:
   - the original scope;
   - the implementer's summary;
   - the changes made by the implementer, using the current diff or changed files as evidence.
4. If the reviewer returns `APPROVED`, stop the loop and summarize the result.
5. If the reviewer returns `CHANGES_REQUESTED`, synthesize only the required fixes into a focused prompt and spawn a new `code-implementer` agent.
6. Repeat implementer -> reviewer until approval.

## Rules
- Keep the orchestrator as the only loop controller.
- Use only one writing implementer at a time against the active worktree.
- Do not ask reviewers or implementers to create a new implementation plan.
- Do not blindly forward optional reviewer suggestions; include only fixes needed for approval.
- Pause and ask the user if a finding requires a product, scope, or architecture decision not covered by the original request.
- If the same issue repeats or the loop appears stuck, stop and report the blocker instead of spinning.

## Output
When the loop finishes, report:
- number of implementation/review rounds;
- final approval status;
- changed files;
- validation performed;
- unresolved blockers or intentionally deferred items, if any.
- A potential git commit message summarizing the final changes, if applicable. Use the `commit-message-generate` skill if available.
